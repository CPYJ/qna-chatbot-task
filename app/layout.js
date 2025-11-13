// app/layout.js
export const metadata = {
    title: 'QA Bot',
    description: 'Gemini + Qdrant Q&A chatbot',
  };
  
  // 공통 틀. page.js 가 / 경로
  export default function RootLayout({ children }) {
    return (
      <html lang="ko">
        <body>
          {children}
        </body>
      </html>
    );
  }
  