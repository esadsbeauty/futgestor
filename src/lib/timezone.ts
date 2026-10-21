const BAHIA_TIME_ZONE = "America/Bahia";

function parts(date = new Date()) {
  const values = new Intl.DateTimeFormat("en-CA", {
    timeZone: BAHIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = Object.fromEntries(values.map((part) => [part.type, part.value]));
  return {
    year: map.year,
    month: map.month,
    day: map.day,
  };
}

export function bahiaDateString(date = new Date()) {
  const { year, month, day } = parts(date);
  return `${year}-${month}-${day}`;
}

export function bahiaReferenceMonth(date = new Date()) {
  const { year, month } = parts(date);
  return `${year}-${month}-01`;
}
