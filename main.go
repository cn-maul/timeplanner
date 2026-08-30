package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os/exec"
	"runtime"
	"time"
)

func main() {
	port := flag.Int("port", 7777, "HTTP 监听端口")
	host := flag.String("host", "127.0.0.1", "HTTP 监听地址（容器/局域网部署用 0.0.0.0）")
	dataPath := flag.String("data", "planner-data.json", "数据文件路径")
	password := flag.String("password", "", "管理密码（设置后写操作需密码、游客只读；每次启动都会覆盖为该值）")
	noOpen := flag.Bool("no-open", false, "启动后不自动打开浏览器")
	flag.Parse()

	store, err := OpenStore(*dataPath)
	if err != nil {
		log.Fatalf("初始化数据失败: %v", err)
	}
	if *password != "" {
		if err := store.SetPassword(*password); err != nil {
			log.Fatalf("设置管理密码失败: %v", err)
		}
		log.Print("已设置管理密码：写操作需密码，游客仅可查看")
	}

	addr := fmt.Sprintf("%s:%d", *host, *port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           NewRouter(store),
		ReadHeaderTimeout: 5 * time.Second,
	}

	// 0.0.0.0 等通配地址按 localhost 展示访问 URL
	displayHost := *host
	if *host == "0.0.0.0" || *host == "::" {
		displayHost = "127.0.0.1"
	}
	url := fmt.Sprintf("http://%s:%d", displayHost, *port)
	log.Printf("时间规划助手已启动: %s（数据文件: %s，Ctrl+C 退出）", url, *dataPath)
	if !*noOpen {
		go openBrowser(url)
	}
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("服务器异常退出: %v", err)
	}
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}
	if err := cmd.Start(); err != nil {
		log.Printf("自动打开浏览器失败（请手动访问 %s）: %v", url, err)
	}
}
