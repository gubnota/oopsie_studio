# Oopsie Studio

ComfyUI 워크플로, 미디어 라이브러리 및 기본 타임라인 편집을 위한 macOS 앱입니다.
Tauri 2 + React + Rust를 사용하며 설치된 앱에는 Node.js 서버가 포함되지 않습니다.

- [프로젝트 설치 및 설정 안내](docs/SETUP.md)
- [English](README.md) · [Русский](README.ru.md)
- [현재 구현 상태](docs/REQUIREMENTS_STATUS.md)

Cloudflare R2는 AWS CLI 없이 직접 연결합니다. 실제 Runpod/R2 검증과 FLUX.3
전용 어댑터는 아직 완료되지 않았습니다. 영상 내보내기에는 별도로 설치한
FFmpeg/ffprobe가 필요합니다.

EnguiStudio에서 파생된 코드는 원래의 [비상업적 라이선스](LICENSE.md)를 따릅니다.
