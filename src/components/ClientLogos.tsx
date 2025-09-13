export function ClientLogos() {
  const logos = [
    'A24', 'HBO', 'Netflix', 'Hulu', 'BBC', 'Paramount', 
    'Sony Pictures', 'Warner Bros', 'Universal', 'Disney'
  ]
  
  return (
    <section className="logos-section" aria-labelledby="logos-title">
      <div className="container">
        <h3 id="logos-title" className="logos-title">Trusted by professionals at</h3>
        <div className="logos-grid">
          {logos.map((name) => (
            <div key={name} className="logo-item">{name}</div>
          ))}
        </div>
      </div>
    </section>
  )
}


