"use client";
import { useState } from "react";
import type { Lesson } from "../data/content";
import { hasVideo } from "../services/learning";

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
        <span aria-hidden="true">▷</span>
        <div>
          <strong>Chưa có video cho bài này</strong>
          <p>Bạn vẫn có thể dùng các học liệu hiện có bên dưới.</p>
        </div>
      </section>
    );
  return (
    <section className="study-video" aria-labelledby="video-title">
      <div className="study-video-heading">
        <h2 id="video-title" tabIndex={-1}>
          Video bài giảng <span>Tham khảo</span>
        </h2>
        <button
          className="inline-link"
          aria-expanded={expanded}
          aria-controls="video-player"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Thu gọn video" : "Mở video"}
        </button>
      </div>
      <div id="video-player" className="study-player" hidden={!expanded}>
        {expanded &&
          (audioActive ? (
            <p role="status">
              Đang nghe bài đọc. Video được dừng để tránh phát hai nguồn âm
              thanh cùng lúc.
            </p>
          ) : (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${lesson.youtubeVideoId}?rel=0&playsinline=1`}
              title={`Video bài giảng: ${lesson.title}`}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ))}
      </div>
      <div className="study-video-source">
        <span>{lesson.youtubeSource || "Video tham khảo trên YouTube"}</span>
        <a
          href={`https://www.youtube.com/watch?v=${lesson.youtubeVideoId}`}
          target="_blank"
          rel="noreferrer"
        >
          Mở trên YouTube ↗
        </a>
      </div>
      <details className="study-transcript">
        <summary>
          Bản chép lời & mô tả video{!lesson.transcript ? " · Chưa có" : ""}
        </summary>
        <p className="paragraph-text">
          {lesson.transcript ||
            "Video này chưa có bản chép lời và mô tả hình ảnh được kiểm tra. Bài đọc bên dưới là học liệu riêng, không phải bản chép lời của video."}
        </p>
      </details>
    </section>
  );
}
