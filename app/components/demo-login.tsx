"use client";

import { useState } from "react";

export default function DemoLogin({
  onLogin,
  onCancel,
}: {
  onLogin: () => void;
  onCancel?: () => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <main className="login-page">
      <section className="login-card" aria-labelledby="login-title">
        <p className="login-brand">Kho học liệu số</p>
        <h1 id="login-title">Đăng nhập</h1>
        <p className="login-intro">
          Vào kho học liệu để đọc, nghe và luyện tập.
        </p>
        <p className="login-demo" id="login-help">
          Bản demo: nhập tài khoản và mật khẩu bất kỳ để vào thử. Không dùng mật
          khẩu thật. Thông tin này không được gửi hoặc lưu lại.
        </p>
        <form
          autoComplete="off"
          aria-describedby="login-help"
          onSubmit={(event) => {
            event.preventDefault();
            event.currentTarget.reset();
            onLogin();
          }}
        >
          <label htmlFor="demo-account">Tài khoản</label>
          <input
            id="demo-account"
            name="demo-account"
            type="text"
            required
            pattern=".*\S.*"
            title="Nhập ít nhất một ký tự không phải khoảng trắng."
            placeholder="Ví dụ: hocsinh"
            autoCapitalize="none"
            spellCheck={false}
          />
          <label htmlFor="demo-password">Mật khẩu</label>
          <div className="login-password">
            <input
              id="demo-password"
              name="demo-password"
              required
              type={showPassword ? "text" : "password"}
              autoComplete="off"
              placeholder="Nhập mật khẩu demo"
            />
            <button
              type="button"
              className="secondary"
              aria-controls="demo-password"
              aria-pressed={showPassword}
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            </button>
          </div>
          <div className="login-actions">
            <button className="primary login-submit" type="submit">
              Đăng nhập
            </button>
            {onCancel && (
              <button
                type="button"
                className="secondary login-cancel"
                onClick={onCancel}
              >
                ← Quay lại Trang chủ
              </button>
            )}
          </div>
        </form>
        <p className="login-footnote">
          Đây là màn hình thử nghiệm, chưa có xác thực tài khoản.
        </p>
      </section>
    </main>
  );
}
