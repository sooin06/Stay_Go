import React from 'react';

export default function LoginScreen({ onLogin }) {
  const handleSocialLogin = (provider) => {
    console.log(`${provider} 로그인 시도`);
    // 실제로는 여기서 소셜 로그인 처리
    // 지금은 바로 지도 화면으로 이동
    onLogin();
  };

  return (
    <div className="login-screen">
      <div className="login-content">
        <div className="logo-section">
          <h1 className="app-title">Stay Go</h1>
        </div>
        
        <div className="login-buttons">
          <button 
            className="social-btn kakao-btn"
            onClick={() => handleSocialLogin('카카오')}
          >
            <span className="btn-icon">💬</span>
            카카오 로그인
          </button>
          
          <button 
            className="social-btn naver-btn"
            onClick={() => handleSocialLogin('네이버')}
          >
            <span className="btn-icon">N</span>
            네이버 로그인
          </button>
          
          <button 
            className="social-btn google-btn"
            onClick={() => handleSocialLogin('구글')}
          >
            <span className="btn-icon">G</span>
            Sign in with Google
          </button>
          
          <button 
            className="social-btn apple-btn"
            onClick={() => handleSocialLogin('애플')}
          >
            <span className="btn-icon">🍎</span>
            Apple로 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
