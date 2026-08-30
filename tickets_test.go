package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func ticketStrPtr(s string) *string { return &s }

// newMockTix 启动一个模拟 tix：要求 X-API-Key 与给定 Key 一致，仅接受 status=0 的查询。
func newMockTix(t *testing.T, apiKey string, hits *atomic.Int64) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/tickets", func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		if r.Header.Get("X-API-Key") != apiKey {
			w.WriteHeader(http.StatusUnauthorized)
			_, _ = w.Write([]byte(`{"error":{"code":401,"message":"API Key 无效"}}`))
			return
		}
		if r.URL.Query().Get("status") != "0" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		_, _ = w.Write([]byte(`{"items":[` +
			`{"id":7,"category":"软件问题","content":"电脑蓝屏","creator":"张三","assignee":"","created_at":"2026-08-30 10:00:00"},` +
			`{"id":3,"category":"网络问题","content":"会议室Wi-Fi不可用","creator":"李四","assignee":"admin","created_at":"2026-08-29 09:00:00"}` +
			`],"total":2,"page":1,"size":100}`))
	})
	return httptest.NewServer(mux)
}

func newTicketTestStore(t *testing.T, url, key string) *Store {
	t.Helper()
	store, err := OpenStore(t.TempDir() + "/data.json")
	if err != nil {
		t.Fatalf("打开存储失败: %v", err)
	}
	if err := store.UpdateIntegration(IntegrationUpdate{TicketURL: url, TicketKey: ticketStrPtr(key)}); err != nil {
		t.Fatalf("保存集成配置失败: %v", err)
	}
	return store
}

func TestPendingTicketsFetch(t *testing.T) {
	var hits atomic.Int64
	srv := newMockTix(t, "key-1", &hits)
	defer srv.Close()
	store := newTicketTestStore(t, srv.URL, "key-1")

	items, total, err := store.PendingTickets()
	if err != nil {
		t.Fatalf("PendingTickets 失败: %v", err)
	}
	if total != 2 || len(items) != 2 {
		t.Fatalf("工单数量不符: total=%d len=%d", total, len(items))
	}
	if items[0].ID != 7 || items[0].Content != "电脑蓝屏" || items[0].Category != "软件问题" {
		t.Fatalf("工单字段不符: %+v", items[0])
	}
}

func TestPendingTicketsBadKey(t *testing.T) {
	var hits atomic.Int64
	srv := newMockTix(t, "key-1", &hits)
	defer srv.Close()
	store := newTicketTestStore(t, srv.URL, "wrong-key")

	_, _, err := store.PendingTickets()
	if err == nil || !strings.Contains(err.Error(), "API Key 无效") {
		t.Fatalf("错误 Key 应报 API Key 无效，实际: %v", err)
	}
}

func TestPendingTicketsNotConfigured(t *testing.T) {
	store, err := OpenStore(t.TempDir() + "/data.json")
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := store.PendingTickets(); err == nil || err.Error() != ErrTicketNotConfigured.Error() {
		t.Fatalf("未配置时应返回 ErrTicketNotConfigured，实际: %v", err)
	}
}

func TestUpdateIntegrationValidation(t *testing.T) {
	store, err := OpenStore(t.TempDir() + "/data.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := store.UpdateIntegration(IntegrationUpdate{TicketURL: "ftp://x"}); err == nil {
		t.Fatal("非 http(s) 地址应被拒绝")
	}
	// ticketKey 为 nil 表示保持不变
	if err := store.UpdateIntegration(IntegrationUpdate{TicketURL: " http://example.com/ ", TicketKey: ticketStrPtr("k1")}); err != nil {
		t.Fatalf("更新失败: %v", err)
	}
	if err := store.UpdateIntegration(IntegrationUpdate{TicketURL: "http://example.com/v2"}); err != nil {
		t.Fatalf("更新失败: %v", err)
	}
	in := store.GetIntegration()
	if in.TicketURL != "http://example.com/v2" || in.TicketKey != "k1" {
		t.Fatalf("Key 应保持不变且地址需归一化: %+v", in)
	}
	// 清空地址即关闭集成
	if err := store.UpdateIntegration(IntegrationUpdate{TicketURL: ""}); err != nil {
		t.Fatal(err)
	}
	if store.HasTicketIntegration() {
		t.Fatal("清空地址后应视为未启用")
	}
}
