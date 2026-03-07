export default function FooterCta() {
  return (
    <section className="footer-cta">
      <div className="section-inner animate-in">
        <h2>Ready to Skip the Middleman?</h2>
        <p>
          Join thousands of Canadians who are buying and selling homes
          commission-free.
        </p>
        <div className="footer-cta-buttons">
          <a href="/api/auth/signup-buyer" className="btn btn-primary">
            Sign Up as Buyer →
          </a>
          <a href="/api/auth/signup-seller" className="btn btn-outline">
            Sign Up as Seller →
          </a>
        </div>
      </div>
    </section>
  );
}
