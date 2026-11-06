const aData = [
  {status: "realizada", data: "2026-06-03", horario: "19:00:00"},
  {status: "realizada", data: "2026-05-28", horario: "17:00:00"},
  {status: "pendente", data: "2026-05-20", horario: "19:00:00"}
];

const res = aData.filter((a) => new Date((a.data + 'T23:59:59').replace(/-/g, '/').replace('T', ' ')) < new Date() || a.status !== 'pendente');
console.log(res);
