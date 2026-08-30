package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"path"
	"runtime/debug"
	"strings"
	"timeplanner/web"
)

// NewRouter 组装 API 与静态资源路由。
func NewRouter(store *Store) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/week", func(w http.ResponseWriter, r *http.Request) {
		wk, err := store.Week(r.URL.Query().Get("date"))
		if err != nil {
			fail(w, http.StatusBadRequest, err)
			return
		}
		writeJSON(w, http.StatusOK, wk)
	})

	mux.HandleFunc("GET /api/events", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{"events": store.ListEvents()})
	})

	mux.HandleFunc("POST /api/events", func(w http.ResponseWriter, r *http.Request) {
		var e Event
		if err := readJSON(w, r, &e); err != nil {
			fail(w, http.StatusBadRequest, err)
			return
		}
		created, err := store.CreateEvent(&e)
		if err != nil {
			failStore(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, created)
	})

	mux.HandleFunc("PUT /api/events/{id}", func(w http.ResponseWriter, r *http.Request) {
		var e Event
		if err := readJSON(w, r, &e); err != nil {
			fail(w, http.StatusBadRequest, err)
			return
		}
		updated, err := store.UpdateEvent(r.PathValue("id"), &e)
		if err != nil {
			failStore(w, err)
			return
		}
		writeJSON(w, http.StatusOK, updated)
	})

	mux.HandleFunc("DELETE /api/events/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := store.DeleteEvent(r.PathValue("id")); err != nil {
			failStore(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("POST /api/blocks", func(w http.ResponseWriter, r *http.Request) {
		var b Block
		if err := readJSON(w, r, &b); err != nil {
			fail(w, http.StatusBadRequest, err)
			return
		}
		created, err := store.CreateBlock(&b)
		if err != nil {
			failStore(w, err)
			return
		}
		writeJSON(w, http.StatusCreated, created)
	})

	mux.HandleFunc("PUT /api/blocks/{id}", func(w http.ResponseWriter, r *http.Request) {
		var b Block
		if err := readJSON(w, r, &b); err != nil {
			fail(w, http.StatusBadRequest, err)
			return
		}
		updated, err := store.UpdateBlock(r.PathValue("id"), &b)
		if err != nil {
			failStore(w, err)
			return
		}
		writeJSON(w, http.StatusOK, updated)
	})

	mux.HandleFunc("DELETE /api/blocks/{id}", func(w http.ResponseWriter, r *http.Request) {
		if err := store.DeleteBlock(r.PathValue("id")); err != nil {
			failStore(w, err)
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	})

	mux.HandleFunc("GET /api/settings", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, store.GetSettings())
	})

	mux.HandleFunc("PUT /api/settings", func(w http.ResponseWriter, r *http.Request) {
		var st Settings
		if err := readJSON(w, r, &st); err != nil {
			fail(w, http.StatusBadRequest, err)
			return
		}
		saved, err := store.UpdateSettings(st)
		if err != nil {
			fail(w, http.StatusBadRequest, err)
			return
		}
		writeJSON(w, http.StatusOK, saved)
	})

	mux.HandleFunc("/", handleStatic)
	return withRecover(mux)
}

func failStore(w http.ResponseWriter, err error) {
	var ce *ConflictError
	if errors.As(err, &ce) {
		fail(w, http.StatusConflict, err)
		return
	}
	if errors.Is(err, ErrNotFound) {
		fail(w, http.StatusNotFound, err)
		return
	}
	fail(w, http.StatusBadRequest, err)
}

func writeJSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func fail(w http.ResponseWriter, code int, err error) {
	writeJSON(w, code, map[string]string{"error": err.Error()})
}

func readJSON(w http.ResponseWriter, r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		return fmt.Errorf("请求体不是合法的 JSON: %w", err)
	}
	return nil
}

func withRecover(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("panic 处理 %s %s: %v\n%s", r.Method, r.URL.Path, rec, debug.Stack())
				fail(w, http.StatusInternalServerError, errors.New("服务器内部错误"))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// handleStatic 提供嵌入的前端构建产物，未命中的路径回退到 index.html（SPA）。
func handleStatic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		http.Error(w, "仅支持 GET 请求", http.StatusMethodNotAllowed)
		return
	}
	sub, err := web.Dist()
	if err != nil {
		http.Error(w, "内置前端资源不可用", http.StatusInternalServerError)
		return
	}
	name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if name == "" {
		name = "index.html"
	}
	if f, err := sub.Open(name); err == nil {
		info, statErr := f.Stat()
		_ = f.Close()
		if statErr == nil && !info.IsDir() {
			http.FileServerFS(sub).ServeHTTP(w, r)
			return
		}
	}
	index, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`<!doctype html><meta charset="utf-8"><title>时间规划助手</title><h1>前端资源缺失</h1><p>请先在 frontend 目录执行 <code>npm install &amp;&amp; npm run build</code>，再重新编译后端。</p>`))
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.Header().Set("Cache-Control", "no-cache")
	_, _ = w.Write(index)
}
