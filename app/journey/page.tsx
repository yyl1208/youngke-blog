import { journey } from '@/lib/journey'

export const metadata = {
  title: '经历 · 杨苛',
  description: '做过的事、待过的公司',
}

export default function JourneyPage() {
  const totalProjects = journey.reduce((n, job) => n + job.projects.length, 0)

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">经历</h1>
        <p className="page-desc">
          按时间倒序。每个项目都写了实际承担的角色和用的技术栈，不写形容词。
        </p>
        <div className="page-meta">
          <span>{journey.length} 家公司</span>
          <span>{totalProjects} 个项目</span>
          <span className="tnum">2018.11 — 2026.02</span>
        </div>
      </header>

      {journey.map((job) => (
        <section className="job" key={job.company}>
          <div className="job-period tnum">{job.period}</div>
          <h2 className="job-company">{job.company}</h2>
          <div className="job-title">{job.title}</div>
          <p className="job-note">{job.note}</p>

          <ul className="project-list">
            {job.projects.map((p) => (
              <li className="project" key={p.name}>
                <div className="project-head">
                  <span className="project-name">{p.name}</span>
                  <span className="project-period tnum">{p.period}</span>
                </div>
                <div className="project-role">{p.role}</div>
                <p className="project-desc">{p.desc}</p>
                <div className="project-stack">{p.stack}</div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
