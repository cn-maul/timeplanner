// Package web 内嵌前端构建产物（frontend 构建输出到本目录的 dist 子目录）。
package web

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var distFS embed.FS

// Dist 返回前端构建产物所在的文件系统。
func Dist() (fs.FS, error) {
	return fs.Sub(distFS, "dist")
}
