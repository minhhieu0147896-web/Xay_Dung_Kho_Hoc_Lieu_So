"use client";
import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
  Video,
  VolumeX,
} from "lucide-react";
import type { Lesson } from "../data/content";
import { extractYoutubeId } from "../services/content";
import { hasVideo } from "../services/learning";

function safeVideoHref(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\/[^\s\\]+$/i.test(trimmed)) return trimmed;
  if (/^\/(?!\/)[^\s\\]*$/.test(trimmed)) return trimmed;
  return null;
}

export default function LessonVideo({
  lesson,
  audioActive,
}: {
  lesson: Lesson;
  audioActive: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  if (!hasVideo(lesson))
    return (
      <section className="study-video-empty" aria-label="Video bài học">
        <span aria-hidden="true">
          <Video size={22} />
        </span>
        <div>
          <strong>Chưa có video cho bài này</strong>
          <p>Bạn vẫn có thể dùng các học liệu hiện có bên dưới.</p>
        </div>
      </section>
    );

  const rawVideoUrl = lesson.videoUrl?.trim() ?? "";
  const ytId =
    (lesson.youtubeVideoId &&
    /^[a-zA-Z0-9_-]{11}$/.test(lesson.youtubeVideoId.trim())
      ? lesson.youtubeVideoId.trim()
      : null) ||
    extractYoutubeId(rawVideoUrl) ||
    "";
  const safeHref = safeVideoHref(rawVideoUrl);
  const isDirectVideoFile =
    !ytId &&
    Boolean(safeHref) &&
    /\.(mp4|webm|ogg)(\?.*|#.*)?$/i.test(rawVideoUrl);
  const isExternalLink = !ytId && !isDirectVideoFile;
  const sourceLabel =
    lesson.youtubeSource?.trim() ||
    (ytId
      ? "Video tham khảo trên YouTube"
      : isDirectVideoFile
        ? "Video bài giảng trực tiếp"
        : "Video bài giảng ở trang học tập ngoài");

  return (
    <section className="study-video" aria-labelledby="video-title">
      <div className="study-video-heading">
        <h2 id="video-title" tabIndex={-1}>
          <Video size={18} aria-hidden="true" /> Video bài giảng{" "}
          <span>Tham khảo</span>
        </h2>
        <button
          className="inline-link"
          aria-expanded={expanded}
          aria-controls="video-player"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp size={16} aria-hidden="true" /> Thu gọn video
            </>
          ) : (
            <>
              <ChevronDown size={16} aria-hidden="true" /> Mở video
            </>
          )}
        </button>
      </div>
      <div
        id="video-player"
        className={
          !audioActive && isExternalLink
            ? "study-player study-player-external"
            : "study-player"
        }
        hidden={!expanded}
      >
        {expanded &&
          (audioActive ? (
            <p role="status">
              <VolumeX size={20} aria-hidden="true" /> Đang nghe bài đọc. Video
              được dừng để tránh phát hai nguồn âm thanh cùng lúc.
            </p>
          ) : ytId ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&playsinline=1`}
              title={`Video bài giảng: ${lesson.title}`}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : isDirectVideoFile && safeHref ? (
            <video
              controls
              preload="metadata"
              src={safeHref}
              aria-label={`Video bài giảng: ${lesson.title}`}
            >
              Trình duyệt của bạn chưa hỗ trợ phát trực tiếp định dạng video
              này.
            </video>
          ) : (
            <div className="study-external-video">
              <p className="study-external-title">
                <strong>{sourceLabel}</strong>
              </p>
              <p className="study-external-url">{rawVideoUrl}</p>
              {safeHref ? (
                <a
                  className="primary study-external-link"
                  href={safeHref}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Mở video bài giảng ở trang ngoài cho bài ${lesson.title}`}
                >
                  Mở video bài giảng ở trang ngoài{" "}
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              ) : (
                <p className="study-external-note" role="status">
                  Đường dẫn video cần bắt đầu bằng https:// hoặc http:// để mở
                  ở trang ngoài.
                </p>
              )}
            </div>
          ))}
      </div>
      <div className="study-video-source">
        <span>{sourceLabel}</span>
        {ytId ? (
          <a
            href={`https://www.youtube.com/watch?v=${ytId}`}
            target="_blank"
            rel="noreferrer"
          >
            Mở trên YouTube <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : safeHref ? (
          <a href={safeHref} target="_blank" rel="noreferrer">
            Mở video bài giảng ở trang ngoài{" "}
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        ) : null}
      </div>
      <details className="study-transcript">
        <summary>
          <FileText size={16} aria-hidden="true" /> Bản chép lời & mô tả video
          {!lesson.transcript ? " · Chưa có" : ""}
        </summary>
        <p className="paragraph-text">
          {lesson.transcript ||
            "Video này chưa có bản chép lời và mô tả hình ảnh được kiểm tra. Bài đọc bên dưới là học liệu riêng, không phải bản chép lời của video."}
        </p>
      </details>
    </section>
  );
}
