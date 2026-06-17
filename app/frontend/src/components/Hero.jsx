export default function Hero() {
  return (
    <>
      <section className="hero">
        <div className="badge">
          <span className="dot"></span>Machine learning · botany
        </div>
        <h1 className="hero-title">
          Identify <em>pollen species</em> from one microscope image
        </h1>
        <p className="hero-sub">
          A neural network trained to tell 21 plant species apart — upload a grain of
          pollen and get an instant prediction with confidence scores.
        </p>
        <p className="hero-authors">
          <span>Youssef Charroud</span><span className="sep">/</span>
          <span>Marwane Laamiri</span><span className="sep">/</span>
          <span>Imad Najam</span>
        </p>
      </section>

      <section className="bento">
        <div className="tile span-3">
          <div className="tile-value">21</div>
          <div className="tile-name">plant species</div>
        </div>
        <div className="tile span-3">
          <div className="tile-value">655</div>
          <div className="tile-name">images studied</div>
        </div>
        <div className="tile span-6 tile-feature">
          <div className="feature-col">
            <div className="tile-value">98%</div>
            <div className="tile-name">training accuracy</div>
          </div>
          <div className="feature-divider" />
          <div className="feature-col">
            <div className="tile-value">72%</div>
            <div className="tile-name">on unseen images</div>
          </div>
        </div>
      </section>
    </>
  );
}
