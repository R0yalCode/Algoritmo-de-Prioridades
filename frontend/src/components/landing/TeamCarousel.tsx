import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';
import { TEAM_MEMBERS } from '../../constants/landing';

export default function TeamCarousel() {
  const [current, setCurrent] = useState(0);
  const total = TEAM_MEMBERS.length;

  const prev = useCallback(() => {
    setCurrent((c) => (c === 0 ? total - 1 : c - 1));
  }, [total]);

  const next = useCallback(() => {
    setCurrent((c) => (c === total - 1 ? 0 : c + 1));
  }, [total]);

  return (
    <section className="landing-section">
      <h2 className="landing-section-title">Equipo de Desarrollo</h2>
      <div className="landing-carousel">
        <div className="landing-carousel-viewport">
          <div
            className="landing-carousel-track"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {TEAM_MEMBERS.map((member, i) => (
              <div key={i} className="landing-team-card">
                <div className="landing-team-avatar">{member.initials}</div>
                <div className="landing-team-name">{member.name}</div>
                <div className="landing-team-role">{member.role}</div>
                <p className="landing-team-desc">{member.description}</p>
                <div className="landing-team-contact">
                  <GitBranch size={14} />
                  <span>{member.github}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="landing-carousel-controls">
          <button
            className="landing-carousel-arrow"
            onClick={prev}
            aria-label="Integrante anterior"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="landing-carousel-dots">
            {TEAM_MEMBERS.map((_, i) => (
              <button
                key={i}
                className={`landing-carousel-dot ${i === current ? 'active' : ''}`}
                onClick={() => setCurrent(i)}
                aria-label={`Ir al integrante ${i + 1}`}
              />
            ))}
          </div>
          <button
            className="landing-carousel-arrow"
            onClick={next}
            aria-label="Siguiente integrante"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
