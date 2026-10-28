const messages = [
  { reference: "Provérbios 16:3", title: "Entregue seus planos", reflection: "Apresente seus projetos a Deus e faça sua parte com dedicação e responsabilidade." },
  { reference: "Salmos 133:1", title: "Valorize a união", reflection: "A convivência em harmonia fortalece o grupo dentro e fora da quadra." },
  { reference: "Filipenses 4:13", title: "Força para prosseguir", reflection: "Nos momentos difíceis, lembre-se de buscar força e perseverança na fé." },
  { reference: "Gálatas 6:9", title: "Não desista de fazer o bem", reflection: "Cada atitude de respeito e generosidade importa, mesmo quando ninguém está olhando." },
  { reference: "Provérbios 27:17", title: "Crescemos juntos", reflection: "Assim como companheiros se ajudam a melhorar no esporte, amizades verdadeiras nos fazem crescer." },
  { reference: "Colossenses 3:23", title: "Dê o seu melhor", reflection: "Faça cada tarefa com dedicação, respeito e um coração disposto." },
  { reference: "Josué 1:9", title: "Coragem e fé", reflection: "Tenha coragem diante dos desafios e mantenha a confiança em Deus." },
];
export function WordOfTheDay({ date }: { date: string }) {
  const day = Math.floor(Date.parse(`${date}T12:00:00Z`) / 86400000);
  const message = messages[((day % messages.length) + messages.length) % messages.length];
  return <section className="card mt-5 p-5 sm:p-6">
    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[var(--brand)]">Palavra do Dia</p>
    <h2 className="mt-2 text-lg font-extrabold">{message.title}</h2>
    <p className="mt-2 text-xs font-bold text-[var(--muted)]">{message.reference}</p>
    <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{message.reflection}</p>
  </section>;
}
