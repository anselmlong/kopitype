import TypingTest from "@/components/TypingTest";

export default function Home() {
  return (
    <main className="app">
      <header className="header">
        <h1 className="logo">
          kopitype<span className="dot">.</span>
        </h1>
        <p className="tagline">singlish typing test</p>
      </header>

      <TypingTest />

      <footer className="footer">
        <span>type until the timer stops. get your singlish wpm.</span>
        <a href="https://github.com/anselmlong/kopitype">github</a>
      </footer>
    </main>
  );
}
