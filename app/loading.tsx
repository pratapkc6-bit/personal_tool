export default function GlobalLoading(){
  return <div className="recovery-page" aria-live="polite" aria-busy="true">
    <section className="recovery-card recovery-loading">
      <div className="recovery-loader" aria-hidden="true"/>
      <p className="professional-kicker">ZORO IS LOADING</p>
      <h1>Assembling your workspace…</h1>
      <p>Reading the next screen without turning it into interpretive dance.</p>
    </section>
  </div>;
}