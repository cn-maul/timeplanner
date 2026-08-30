package main

import (
	"fmt"
	"sort"
	"strconv"
	"time"
)

// parseHM 解析 "HH:MM" 为当日分钟数（"24:00" 视为 1440）。
func parseHM(s string) (int, error) {
	if s == "24:00" {
		return 1440, nil
	}
	if !hmRE.MatchString(s) {
		return 0, fmt.Errorf("应为 HH:MM 格式，收到 %q", s)
	}
	h, _ := strconv.Atoi(s[:2])
	m, _ := strconv.Atoi(s[3:])
	return h*60 + m, nil
}

func parseDate(s string) (time.Time, error) {
	t, err := time.ParseInLocation("2006-01-02", s, time.Local)
	if err != nil {
		return time.Time{}, fmt.Errorf("应为 YYYY-MM-DD 格式，收到 %q", s)
	}
	return t, nil
}

// isoWeekday 返回 ISO 星期序号：1=周一 … 7=周日。
func isoWeekday(t time.Time) int {
	w := int(t.Weekday())
	if w == 0 {
		return 7
	}
	return w
}

func sliceContains(xs []int, v int) bool {
	for _, x := range xs {
		if x == v {
			return true
		}
	}
	return false
}

// eventOccursOn 判断周期事件在给定星期与日期是否生效。
func eventOccursOn(e *Event, weekday int, dateStr string) bool {
	if !e.Enabled {
		return false
	}
	if !sliceContains(e.Weekdays, weekday) {
		return false
	}
	if e.From != "" && dateStr < e.From {
		return false
	}
	if e.To != "" && dateStr > e.To {
		return false
	}
	return true
}

// ---------- 周视图数据 ----------

// FreeInterval 一段空闲时间。
type FreeInterval struct {
	Start   string `json:"start"`
	End     string `json:"end"`
	Minutes int    `json:"minutes"`
}

// Occurrence 周期事件在具体某天的一次出现。
type Occurrence struct {
	EventID  string `json:"eventId"`
	Title    string `json:"title"`
	Category string `json:"category"`
	Start    string `json:"start"`
	End      string `json:"end"`
}

// DayStats 单日统计（分钟）。
type DayStats struct {
	FixedMin   int            `json:"fixedMin"`
	PlannedMin int            `json:"plannedMin"`
	FreeMin    int            `json:"freeMin"`
	ByCategory map[string]int `json:"byCategory"`
}

// DayJSON 单日时间表：固定事件、已安排活动、空闲时段。
type DayJSON struct {
	Date    string         `json:"date"`
	Weekday int            `json:"weekday"`
	IsToday bool           `json:"isToday"`
	Events  []Occurrence   `json:"events"`
	Blocks  []Block        `json:"blocks"`
	Free    []FreeInterval `json:"free"`
	Stats   DayStats       `json:"stats"`
}

// WeekStats 一周统计（分钟）。
type WeekStats struct {
	FixedMin   int            `json:"fixedMin"`
	PlannedMin int            `json:"plannedMin"`
	FreeMin    int            `json:"freeMin"`
	ByCategory map[string]int `json:"byCategory"`
}

// WeekJSON 一周时间表。
type WeekJSON struct {
	WeekStart  string    `json:"weekStart"`
	WeekEnd    string    `json:"weekEnd"`
	Settings   Settings  `json:"settings"`
	EventCount int       `json:"eventCount"`
	Days       []DayJSON `json:"days"`
	Stats      WeekStats `json:"stats"`
}

type span struct{ s, e int }

// Week 计算包含 dateStr 那一周（周一开始）的完整时间表与空闲时段。
func (s *Store) Week(dateStr string) (*WeekJSON, error) {
	var anchor time.Time
	if dateStr == "" {
		anchor = time.Now()
	} else {
		t, err := parseDate(dateStr)
		if err != nil {
			return nil, err
		}
		anchor = t
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	dayStart, err := parseHM(s.d.Settings.DayStart)
	if err != nil {
		return nil, fmt.Errorf("设置中的每日开始时间无效: %w", err)
	}
	dayEnd, err := parseHM(s.d.Settings.DayEnd)
	if err != nil {
		return nil, fmt.Errorf("设置中的每日结束时间无效: %w", err)
	}

	weekStart := anchor.AddDate(0, 0, -(isoWeekday(anchor) - 1))
	today := time.Now().Format("2006-01-02")

	wk := &WeekJSON{
		WeekStart:  weekStart.Format("2006-01-02"),
		WeekEnd:    weekStart.AddDate(0, 0, 6).Format("2006-01-02"),
		Settings:   s.d.Settings,
		EventCount: len(s.d.Events),
		Stats:      WeekStats{ByCategory: map[string]int{}},
	}

	for i := 0; i < 7; i++ {
		day := weekStart.AddDate(0, 0, i)
		dayStr := day.Format("2006-01-02")
		wd := isoWeekday(day)

		dj := DayJSON{
			Date:    dayStr,
			Weekday: wd,
			IsToday: dayStr == today,
			Events:  []Occurrence{},
			Blocks:  []Block{},
			Free:    []FreeInterval{},
			Stats:   DayStats{ByCategory: map[string]int{}},
		}
		var busy []span

		for _, e := range s.d.Events {
			if !eventOccursOn(e, wd, dayStr) {
				continue
			}
			es, _ := parseHM(e.Start)
			ee, _ := parseHM(e.End)
			dj.Events = append(dj.Events, Occurrence{EventID: e.ID, Title: e.Title, Category: e.Category, Start: e.Start, End: e.End})
			busy = append(busy, span{es, ee})
			dj.Stats.FixedMin += ee - es
			wk.Stats.FixedMin += ee - es
		}
		sort.Slice(dj.Events, func(a, b int) bool { return dj.Events[a].Start < dj.Events[b].Start })

		for _, b := range s.d.Blocks {
			if b.Date != dayStr {
				continue
			}
			bs, _ := parseHM(b.Start)
			be, _ := parseHM(b.End)
			dj.Blocks = append(dj.Blocks, *b)
			busy = append(busy, span{bs, be})
			dj.Stats.PlannedMin += be - bs
			dj.Stats.ByCategory[b.Category] += be - bs
			wk.Stats.PlannedMin += be - bs
			wk.Stats.ByCategory[b.Category] += be - bs
		}
		sort.Slice(dj.Blocks, func(a, b int) bool { return dj.Blocks[a].Start < dj.Blocks[b].Start })

		for _, f := range freeSpans(busy, span{dayStart, dayEnd}) {
			dj.Free = append(dj.Free, FreeInterval{Start: fmtHM(f.s), End: fmtHM(f.e), Minutes: f.e - f.s})
			dj.Stats.FreeMin += f.e - f.s
			wk.Stats.FreeMin += f.e - f.s
		}

		wk.Days = append(wk.Days, dj)
	}
	return wk, nil
}

// fmtHM 将当日分钟数格式化为 "HH:MM"（1440 → "24:00"）。
func fmtHM(mins int) string {
	return fmt.Sprintf("%02d:%02d", mins/60, mins%60)
}

// mergeSpans 合并重叠与相邻的时间段。
func mergeSpans(sp []span) []span {
	if len(sp) == 0 {
		return nil
	}
	sorted := append([]span(nil), sp...)
	sort.Slice(sorted, func(i, j int) bool {
		if sorted[i].s != sorted[j].s {
			return sorted[i].s < sorted[j].s
		}
		return sorted[i].e < sorted[j].e
	})
	out := []span{sorted[0]}
	for _, cur := range sorted[1:] {
		last := &out[len(out)-1]
		if cur.s <= last.e {
			if cur.e > last.e {
				last.e = cur.e
			}
		} else {
			out = append(out, cur)
		}
	}
	return out
}

// freeSpans 计算窗口内去掉忙段后的空闲段。
func freeSpans(busy []span, window span) []span {
	var out []span
	cur := window.s
	for _, m := range mergeSpans(busy) {
		if m.s > cur {
			out = append(out, span{cur, m.s})
		}
		if m.e > cur {
			cur = m.e
		}
	}
	if cur < window.e {
		out = append(out, span{cur, window.e})
	}
	return out
}
