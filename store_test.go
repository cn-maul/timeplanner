package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// writeFixture 写入一份包含旧分类与过期数据的测试数据文件。
func writeFixture(t *testing.T, path string) {
	t.Helper()
	recent := time.Now().AddDate(0, 0, -5).Format("2006-01-02")
	raw := `{
  "version": 1,
  "settings": {"dayStart": "07:00", "dayEnd": "23:00"},
  "events": [
    {"id": "e1", "title": "旧健身课", "category": "fitness", "weekdays": [1], "start": "09:00", "end": "10:00", "enabled": true},
    {"id": "e2", "title": "已结束课程", "category": "class", "weekdays": [2], "start": "09:00", "end": "10:00", "to": "2020-01-01", "enabled": true},
    {"id": "e3", "title": "长期例会", "category": "meeting", "weekdays": [1], "start": "09:00", "end": "10:00", "enabled": true}
  ],
  "blocks": [
    {"id": "b1", "date": "2020-01-01", "start": "09:00", "end": "10:00", "title": "旧个人事务", "category": "personal"},
    {"id": "b2", "date": "` + recent + `", "start": "09:00", "end": "10:00", "title": "近期工作", "category": "work"}
  ]
}`
	if err := os.WriteFile(path, []byte(raw), 0o644); err != nil {
		t.Fatalf("写入测试数据失败: %v", err)
	}
}

func TestNormalizeMigratesAndCleans(t *testing.T) {
	path := filepath.Join(t.TempDir(), "data.json")
	writeFixture(t, path)

	store, err := OpenStore(path)
	if err != nil {
		t.Fatalf("打开存储失败: %v", err)
	}
	_ = store

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("读取整理后的数据失败: %v", err)
	}
	var d plannerData
	if err := json.Unmarshal(raw, &d); err != nil {
		t.Fatalf("解析整理后的数据失败: %v", err)
	}

	// 迁移：fitness → other；personal → leisure
	if len(d.Events) != 2 {
		t.Fatalf("期望保留 2 条事件，实际 %d 条", len(d.Events))
	}
	if d.Events[0].Category != "other" {
		t.Errorf("fitness 应迁移为 other，实际 %q", d.Events[0].Category)
	}
	if len(d.Blocks) != 1 {
		t.Fatalf("期望保留 1 条安排，实际 %d 条", len(d.Blocks))
	}
	if d.Blocks[0].Category != "work" {
		t.Errorf("近期安排分类不应变化，实际 %q", d.Blocks[0].Category)
	}

	// 清理：过期事件（to 早于 30 天）与旧安排（日期早于 30 天）被删除
	for _, e := range d.Events {
		if e.Title == "已结束课程" {
			t.Error("生效结束早于 30 天的周期事件应被清除")
		}
	}
	for _, b := range d.Blocks {
		if b.Title == "旧个人事务" {
			t.Error("日期早于 30 天的安排应被清除")
		}
	}
}

func TestValidateRejectsRemovedCategories(t *testing.T) {
	e := &Event{Title: "健身", Category: "fitness", Weekdays: []int{1}, Start: "09:00", End: "10:00", Enabled: true}
	if err := validateEvent(e); err == nil {
		t.Error("fitness 分类应被拒绝")
	}
	b := &Block{Date: "2026-08-31", Start: "09:00", End: "10:00", Category: "personal"}
	if err := validateBlock(b); err == nil {
		t.Error("personal 分类应被拒绝")
	}
}
