package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// tix 工单系统集成：通过 tix 管理端生成的 API Key（X-API-Key 请求头）免登录拉取待处理工单。
// 服务端代理请求，避免浏览器跨域与 Key 暴露给访客。

// ErrTicketNotConfigured 表示尚未配置工单系统地址。
var ErrTicketNotConfigured = errors.New("尚未配置工单系统地址，请先在设置中填写")

var ticketHTTP = &http.Client{Timeout: 8 * time.Second}

// PendingTicket 待处理工单的精简视图。
type PendingTicket struct {
	ID        int    `json:"id"`
	Category  string `json:"category"`
	Content   string `json:"content"`
	Creator   string `json:"creator"`
	Assignee  string `json:"assignee"`
	CreatedAt string `json:"createdAt"`
}

// tixFetchPending 用 API Key 拉取 tix 待处理工单；Key 无效时返回 401 错误。
func tixFetchPending(integ Integration) ([]PendingTicket, int, error) {
	req, err := http.NewRequest(http.MethodGet, integ.TicketURL+"/api/tickets?status=0&size=100&order=desc", nil)
	if err != nil {
		return nil, 0, err
	}
	req.Header.Set("X-API-Key", integ.TicketKey)
	resp, err := ticketHTTP.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("无法连接工单系统: %w", err)
	}
	defer resp.Body.Close()
	switch {
	case resp.StatusCode == http.StatusUnauthorized:
		return nil, 0, errors.New("工单系统拒绝访问：API Key 无效或已被轮换，请重新生成并填写")
	case resp.StatusCode != http.StatusOK:
		return nil, 0, fmt.Errorf("工单系统返回 HTTP %d", resp.StatusCode)
	}
	var body struct {
		Items []struct {
			ID        int    `json:"id"`
			Category  string `json:"category"`
			Content   string `json:"content"`
			Creator   string `json:"creator"`
			Assignee  string `json:"assignee"`
			CreatedAt string `json:"created_at"`
		} `json:"items"`
		Total int `json:"total"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, 0, fmt.Errorf("解析工单系统响应失败: %w", err)
	}
	items := make([]PendingTicket, 0, len(body.Items))
	for _, it := range body.Items {
		items = append(items, PendingTicket{
			ID:        it.ID,
			Category:  it.Category,
			Content:   it.Content,
			Creator:   it.Creator,
			Assignee:  it.Assignee,
			CreatedAt: it.CreatedAt,
		})
	}
	return items, body.Total, nil
}

// PendingTickets 获取待处理工单列表。
func (s *Store) PendingTickets() ([]PendingTicket, int, error) {
	integ := s.GetIntegration()
	if integ.TicketURL == "" {
		return nil, 0, ErrTicketNotConfigured
	}
	return tixFetchPending(integ)
}

// TestTicketIntegrationCfg 对给定配置做连接测试（用于设置保存前验证）。
func (s *Store) TestTicketIntegrationCfg(integ Integration) (int, error) {
	integ.TicketURL = strings.TrimRight(strings.TrimSpace(integ.TicketURL), "/")
	if integ.TicketURL == "" {
		return 0, ErrTicketNotConfigured
	}
	_, total, err := tixFetchPending(integ)
	return total, err
}
