import { LINKS } from '../lib/links'

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="about-link" href={href} target="_blank" rel="noopener noreferrer">
      <span>{children}</span>
      <span aria-hidden="true">↗</span>
    </a>
  )
}

export function About() {
  return (
    <div className="about">
      <h2>About Arya Vault</h2>
      <p>
        Free, offline, no login, no tracking. Your data never leaves this device. Open source under the MIT license,
        built by Aniketh at Arya Labs.
      </p>

      <h3>Feedback</h3>
      <p>Found a bug or want something added? Tell me, every request gets read.</p>
      <A href={LINKS.feedback}>Send feedback on GitHub</A>

      <h3>Project</h3>
      <A href={LINKS.repo}>Source code</A>
      <A href={LINKS.contributors}>Contributors</A>

      <h3>Find me</h3>
      <A href={LINKS.github}>GitHub</A>
      <A href={LINKS.linkedin}>LinkedIn</A>
      <A href={LINKS.portfolio}>Portfolio</A>
    </div>
  )
}
