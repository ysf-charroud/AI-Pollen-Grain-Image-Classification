export default function Hero() {
  return (
    <>
      <section className="hero">
        <div className="eyebrow">
          <span className="dot"></span>SCIENCE FAIR · MACHINE LEARNING MEETS BOTANY
        </div>
        <h1 className="title">
          Teaching a computer to recognise <em>pollen</em>
        </h1>
        <p className="lede">
          A small neural network that learns to tell 21 plant species apart — using
          nothing but a single microscope image of a grain of pollen.
        </p>
        <p className="authors">
          <span>Youssef Charroud</span><span className="sep">·</span>
          <span>Marwane Laamiri</span><span className="sep">·</span>
          <span>Imad Najam</span>
        </p>
      </section>

      <section className="statband">
        <div className="stat">
          <div className="stat-num">21</div>
          <div className="stat-label">
            plant species<br />it can name
          </div>
        </div>
        <div className="stat">
          <div className="stat-num">655</div>
          <div className="stat-label">
            microscope images<br />it studied
          </div>
        </div>
        <div className="stat accent">
          <div className="stat-num">98%</div>
          <div className="stat-label">
            learned from its<br />study images
          </div>
        </div>
        <div className="stat accent">
          <div className="stat-num">72%</div>
          <div className="stat-label">
            correct on images<br />it had never seen
          </div>
        </div>
      </section>
    </>
  );
}
