package main

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

const dataVersion = 1

// ErrNotFound 表示请求的记录不存在。
var ErrNotFound = errors.New("记录不存在")

// ConflictError 表示新安排与已有时间冲突。
type ConflictError struct{ Messages []string }

func (c *ConflictError) Error() string { return strings.Join(c.Messages, "；") }

// Settings 每日规划时段设置。
type Settings struct {
	DayStart string `json:"dayStart"`
	DayEnd   string `json:"dayEnd"`
}

// Event 周期事件：固定重复的日程（例会、课程、健身等）。
type Event struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Category string `json:"category"`
	Weekdays []int  `json:"weekdays"` // 1=周一 … 7=周日
	Start    string `json:"start"`    // HH:MM
	End      string `json:"end"`      // HH:MM
	From     string `json:"from,omitempty"`
	To       string `json:"to,omitempty"`
	Notes    string `json:"notes,omitempty"`
	Enabled  bool   `json:"enabled"`
}

// Block 单次安排：用户在空闲时段内计划的活动（工作、学习、休闲、个人事务）。
type Block struct {
	ID       string `json:"id"`
	Date     string `json:"date"` // YYYY-MM-DD
	Start    string `json:"start"`
	End      string `json:"end"`
	Title    string `json:"title"`
	Category string `json:"category"`
	Notes    string `json:"notes,omitempty"`
}

type plannerData struct {
	Version      int      `json:"version"`
	Settings     Settings `json:"settings"`
	Events       []*Event `json:"events"`
	Blocks       []*Block `json:"blocks"`
	PasswordSalt string   `json:"passwordSalt,omitempty"`
	PasswordHash string   `json:"passwordHash,omitempty"`
}

var fixedCategories = map[string]bool{"meeting": true, "class": true, "fitness": true, "life": true, "other": true}
var planCategories = map[string]bool{"work": true, "study": true, "leisure": true, "personal": true}
var planLabels = map[string]string{"work": "工作", "study": "学习", "leisure": "休闲", "personal": "个人事务"}

var (
	hmRE   = regexp.MustCompile(`^([01]\d|2[0-3]):[0-5]\d$`)
	dateRE = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
)

// Store 基于本地 JSON 文件的存储，所有访问通过互斥锁串行化。
type Store struct {
	mu   sync.RWMutex
	path string
	d    *plannerData
}

func defaultData() *plannerData {
	return &plannerData{
		Version:  dataVersion,
		Settings: Settings{DayStart: "07:00", DayEnd: "23:00"},
		Events:   []*Event{},
		Blocks:   []*Block{},
	}
}

// OpenStore 打开（不存在则创建）数据文件。
func OpenStore(path string) (*Store, error) {
	s := &Store{path: path, d: defaultData()}
	raw, err := os.ReadFile(path)
	if err != nil {
		if !errors.Is(err, os.ErrNotExist) {
			return nil, fmt.Errorf("读取数据文件失败: %w", err)
		}
		if err := s.saveLocked(); err != nil {
			return nil, fmt.Errorf("创建数据文件失败: %w", err)
		}
		return s, nil
	}
	if err := json.Unmarshal(raw, s.d); err != nil {
		return nil, fmt.Errorf("数据文件 %s 格式错误: %w", path, err)
	}
	if s.d.Settings.DayStart == "" {
		s.d.Settings.DayStart = "07:00"
	}
	if s.d.Settings.DayEnd == "" {
		s.d.Settings.DayEnd = "23:00"
	}
	if s.d.Events == nil {
		s.d.Events = []*Event{}
	}
	if s.d.Blocks == nil {
		s.d.Blocks = []*Block{}
	}
	return s, nil
}

func (s *Store) saveLocked() error {
	raw, err := json.MarshalIndent(s.d, "", "  ")
	if err != nil {
		return err
	}
	tmp := s.path + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o644); err != nil {
		return err
	}
	return os.Rename(tmp, s.path)
}

func newID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return hex.EncodeToString(b)
}

// ---------- 周期事件 ----------

func copyEvent(e *Event) Event {
	cp := *e
	cp.Weekdays = append([]int(nil), e.Weekdays...)
	return cp
}

func sortEvents(evs []Event) {
	sort.Slice(evs, func(i, j int) bool {
		a, b := evs[i], evs[j]
		if len(a.Weekdays) == 0 || len(b.Weekdays) == 0 {
			return a.Title < b.Title
		}
		if a.Weekdays[0] != b.Weekdays[0] {
			return a.Weekdays[0] < b.Weekdays[0]
		}
		if a.Start != b.Start {
			return a.Start < b.Start
		}
		return a.Title < b.Title
	})
}

// ListEvents 返回全部周期事件（按星期与开始时间排序）。
func (s *Store) ListEvents() []Event {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Event, 0, len(s.d.Events))
	for _, e := range s.d.Events {
		out = append(out, copyEvent(e))
	}
	sortEvents(out)
	return out
}

// CreateEvent 新增周期事件。
func (s *Store) CreateEvent(e *Event) (Event, error) {
	if err := validateEvent(e); err != nil {
		return Event{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	e.ID = newID()
	cp := *e
	cp.Weekdays = append([]int(nil), e.Weekdays...)
	s.d.Events = append(s.d.Events, &cp)
	if err := s.saveLocked(); err != nil {
		return Event{}, err
	}
	return copyEvent(&cp), nil
}

// UpdateEvent 修改周期事件。
func (s *Store) UpdateEvent(id string, e *Event) (Event, error) {
	if err := validateEvent(e); err != nil {
		return Event{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	old := s.findEvent(id)
	if old == nil {
		return Event{}, ErrNotFound
	}
	e.ID = id
	cp := *e
	cp.Weekdays = append([]int(nil), e.Weekdays...)
	*old = cp
	if err := s.saveLocked(); err != nil {
		return Event{}, err
	}
	return copyEvent(old), nil
}

// DeleteEvent 删除周期事件。
func (s *Store) DeleteEvent(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, e := range s.d.Events {
		if e.ID == id {
			s.d.Events = append(s.d.Events[:i], s.d.Events[i+1:]...)
			return s.saveLocked()
		}
	}
	return ErrNotFound
}

func (s *Store) findEvent(id string) *Event {
	for _, e := range s.d.Events {
		if e.ID == id {
			return e
		}
	}
	return nil
}

// ---------- 单次安排 ----------

// CreateBlock 新增安排，与周期事件或其他安排冲突时返回 ConflictError。
func (s *Store) CreateBlock(b *Block) (Block, error) {
	if err := validateBlock(b); err != nil {
		return Block{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if msgs := s.blockConflicts(b, ""); len(msgs) > 0 {
		return Block{}, &ConflictError{msgs}
	}
	b.ID = newID()
	cp := *b
	s.d.Blocks = append(s.d.Blocks, &cp)
	if err := s.saveLocked(); err != nil {
		return Block{}, err
	}
	return cp, nil
}

// UpdateBlock 修改安排（排除自身后做冲突校验）。
func (s *Store) UpdateBlock(id string, b *Block) (Block, error) {
	if err := validateBlock(b); err != nil {
		return Block{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	old := s.findBlock(id)
	if old == nil {
		return Block{}, ErrNotFound
	}
	if msgs := s.blockConflicts(b, id); len(msgs) > 0 {
		return Block{}, &ConflictError{msgs}
	}
	b.ID = id
	*old = *b
	if err := s.saveLocked(); err != nil {
		return Block{}, err
	}
	return *old, nil
}

// DeleteBlock 删除安排。
func (s *Store) DeleteBlock(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i, b := range s.d.Blocks {
		if b.ID == id {
			s.d.Blocks = append(s.d.Blocks[:i], s.d.Blocks[i+1:]...)
			return s.saveLocked()
		}
	}
	return ErrNotFound
}

func (s *Store) findBlock(id string) *Block {
	for _, b := range s.d.Blocks {
		if b.ID == id {
			return b
		}
	}
	return nil
}

// ---------- 设置 ----------

func (s *Store) GetSettings() Settings {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.d.Settings
}

func (s *Store) UpdateSettings(st Settings) (Settings, error) {
	start, err := parseHM(st.DayStart)
	if err != nil {
		return Settings{}, fmt.Errorf("每日开始时间无效: %w", err)
	}
	end, err := parseHM(st.DayEnd)
	if err != nil {
		return Settings{}, fmt.Errorf("每日结束时间无效: %w", err)
	}
	if start >= end {
		return Settings{}, errors.New("每日开始时间必须早于结束时间")
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.d.Settings = Settings{DayStart: st.DayStart, DayEnd: st.DayEnd}
	if err := s.saveLocked(); err != nil {
		return Settings{}, err
	}
	return s.d.Settings, nil
}

// ---------- 管理密码 ----------

// hashPassword 计算 sha256(salt + ":" + password) 的十六进制表示。
// 面向个人/小团队场景的基础防护，避免明文存储即可。
func hashPassword(salt, password string) string {
	sum := sha256.Sum256([]byte(salt + ":" + password))
	return hex.EncodeToString(sum[:])
}

// HasPassword 是否已设置管理密码。
func (s *Store) HasPassword() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.d.PasswordHash != ""
}

// VerifyPassword 校验管理密码；未设置密码时返回 false。
func (s *Store) VerifyPassword(password string) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.d.PasswordHash == "" {
		return false
	}
	got := hashPassword(s.d.PasswordSalt, password)
	return subtle.ConstantTimeCompare([]byte(got), []byte(s.d.PasswordHash)) == 1
}

// SetPassword 设置（或重置）管理密码。
func (s *Store) SetPassword(password string) error {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return fmt.Errorf("生成随机盐失败: %w", err)
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.d.PasswordSalt = hex.EncodeToString(salt)
	s.d.PasswordHash = hashPassword(s.d.PasswordSalt, password)
	return s.saveLocked()
}

// ---------- 校验与冲突 ----------

func validateEvent(e *Event) error {
	e.Title = strings.TrimSpace(e.Title)
	if e.Title == "" {
		return errors.New("请填写事件名称")
	}
	if len([]rune(e.Title)) > 100 {
		return errors.New("事件名称不能超过 100 字")
	}
	if !fixedCategories[e.Category] {
		return fmt.Errorf("无效的事件分类: %q", e.Category)
	}
	if len(e.Weekdays) == 0 {
		return errors.New("请至少选择一个重复的星期")
	}
	seen := map[int]bool{}
	for _, w := range e.Weekdays {
		if w < 1 || w > 7 {
			return fmt.Errorf("无效的星期值: %d", w)
		}
		if seen[w] {
			return fmt.Errorf("星期值重复: %d", w)
		}
		seen[w] = true
	}
	sort.Ints(e.Weekdays)
	start, err := parseHM(e.Start)
	if err != nil {
		return fmt.Errorf("开始时间无效: %w", err)
	}
	end, err := parseHM(e.End)
	if err != nil {
		return fmt.Errorf("结束时间无效: %w", err)
	}
	if start >= end {
		return errors.New("开始时间必须早于结束时间")
	}
	if e.From != "" {
		if !dateRE.MatchString(e.From) {
			return errors.New("生效开始日期格式应为 YYYY-MM-DD")
		}
		if _, err := parseDate(e.From); err != nil {
			return err
		}
	}
	if e.To != "" {
		if !dateRE.MatchString(e.To) {
			return errors.New("生效结束日期格式应为 YYYY-MM-DD")
		}
		if _, err := parseDate(e.To); err != nil {
			return err
		}
	}
	if e.From != "" && e.To != "" && e.From > e.To {
		return errors.New("生效开始日期不能晚于结束日期")
	}
	e.Notes = strings.TrimSpace(e.Notes)
	return nil
}

func validateBlock(b *Block) error {
	if !planCategories[b.Category] {
		return fmt.Errorf("无效的活动分类: %q", b.Category)
	}
	b.Title = strings.TrimSpace(b.Title)
	if len([]rune(b.Title)) > 100 {
		return errors.New("活动名称不能超过 100 字")
	}
	if b.Title == "" {
		b.Title = planLabels[b.Category]
	}
	if !dateRE.MatchString(b.Date) {
		return errors.New("日期格式应为 YYYY-MM-DD")
	}
	if _, err := parseDate(b.Date); err != nil {
		return err
	}
	start, err := parseHM(b.Start)
	if err != nil {
		return fmt.Errorf("开始时间无效: %w", err)
	}
	end, err := parseHM(b.End)
	if err != nil {
		return fmt.Errorf("结束时间无效: %w", err)
	}
	if start >= end {
		return errors.New("开始时间必须早于结束时间")
	}
	b.Notes = strings.TrimSpace(b.Notes)
	return nil
}

// blockConflicts 返回指定安排与周期事件、其他安排的冲突描述列表。
func (s *Store) blockConflicts(b *Block, excludeID string) []string {
	var msgs []string
	start, _ := parseHM(b.Start)
	end, _ := parseHM(b.End)
	day, _ := parseDate(b.Date)
	wd := isoWeekday(day)

	for _, e := range s.d.Events {
		if !eventOccursOn(e, wd, b.Date) {
			continue
		}
		es, _ := parseHM(e.Start)
		ee, _ := parseHM(e.End)
		if start < ee && es < end {
			msgs = append(msgs, fmt.Sprintf("与周期事件「%s」(%s–%s) 时间冲突", e.Title, e.Start, e.End))
		}
	}
	for _, other := range s.d.Blocks {
		if other.ID == excludeID || other.Date != b.Date {
			continue
		}
		os2, _ := parseHM(other.Start)
		oe, _ := parseHM(other.End)
		if start < oe && os2 < end {
			msgs = append(msgs, fmt.Sprintf("与已安排的「%s」(%s–%s) 时间冲突", other.Title, other.Start, other.End))
		}
	}
	return msgs
}
