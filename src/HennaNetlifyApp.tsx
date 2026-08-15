import { FormEvent, PointerEvent, useMemo, useState } from "react";
import { BOOKING_TIMES, HENNA_MODELS, type BookingTime, type HennaModel } from "./henna-data";

type LocalBooking = {
  id: string;
  modelId: string;
  modelName: string;
  date: string;
  time: string;
  customerName?: string;
  contact?: string;
  peopleCount?: string;
  handCount?: string;
  notes?: string;
};

type Feedback = {
  tone: "idle" | "success" | "error";
  message: string;
};

const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const peopleOptions = ["1", "2", "3", "4", "5+"];
const handOptions = ["1 main", "2 mains", "3-4 mains", "5-6 mains", "7+ mains"];
const storageKey = "henne-06-netlify-bookings";

function toDateKey(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function dateLabel(dateKey: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(`${dateKey}T12:00:00`));
}

function buildMonthDays(month: Date) {
  const first = startOfMonth(month);
  const leadingEmptyDays = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

  return Array.from({ length: leadingEmptyDays + daysInMonth }, (_, index) => {
    if (index < leadingEmptyDays) {
      return null;
    }

    return new Date(first.getFullYear(), first.getMonth(), index - leadingEmptyDays + 1);
  });
}

function modelById(modelId: string): HennaModel {
  return HENNA_MODELS.find((model) => model.id === modelId) ?? HENNA_MODELS[0];
}

function encodeFormData(data: Record<string, string>) {
  return new URLSearchParams(data).toString();
}

async function submitNetlifyBooking(data: Record<string, string>) {
  const response = await fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: encodeFormData(data),
  });

  if (!response.ok && !isLocalPreview()) {
    throw new Error("Netlify form submission failed");
  }
}

function isLocalPreview() {
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
}

function ModelArtwork({ className = "" }: { className?: string }) {
  return (
    <span className={`model-art ${className}`.trim()} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

export function HennaNetlifyApp() {
  const todayKey = toDateKey(new Date());
  const [hasEntered, setHasEntered] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedTime, setSelectedTime] = useState<BookingTime>(BOOKING_TIMES[1]);
  const [selectedModelId, setSelectedModelId] = useState<HennaModel["id"]>(HENNA_MODELS[0].id);
  const [bookings, setBookings] = useState<LocalBooking[]>(() => {
    const storedBookings = window.localStorage.getItem(storageKey);
    if (!storedBookings) {
      return [];
    }

    try {
      return JSON.parse(storedBookings) as LocalBooking[];
    } catch {
      window.localStorage.removeItem(storageKey);
      return [];
    }
  });
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [peopleCount, setPeopleCount] = useState(peopleOptions[0]);
  const [handCount, setHandCount] = useState(handOptions[1]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>({ tone: "idle", message: "" });

  const selectedModel = modelById(selectedModelId);
  const monthDays = buildMonthDays(monthCursor);

  const bookingsByDate = useMemo(() => {
    const grouped = new Map<string, LocalBooking[]>();

    bookings.forEach((booking) => {
      const entries = grouped.get(booking.date) ?? [];
      entries.push(booking);
      grouped.set(
        booking.date,
        entries.sort((first, second) => first.time.localeCompare(second.time)),
      );
    });

    return grouped;
  }, [bookings]);

  const selectedDayBookings = bookingsByDate.get(selectedDate) ?? [];
  const bookedTimes = new Set(selectedDayBookings.map((booking) => booking.time));
  const bookingByTime = new Map(selectedDayBookings.map((booking) => [booking.time, booking]));
  const nextOpenSlot = BOOKING_TIMES.find((time) => !bookedTimes.has(time));
  const activeTime = bookedTimes.has(selectedTime) && nextOpenSlot ? nextOpenSlot : selectedTime;
  const activeSlotIsBooked = bookedTimes.has(activeTime);

  function handleSpotlight(event: PointerEvent<HTMLElement>) {
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
  }

  function moveMonth(direction: -1 | 1) {
    setMonthCursor(
      (current) => new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  function openCalendar(modelId: HennaModel["id"]) {
    setSelectedModelId(modelId);
    setIsCalendarOpen(true);
    setFeedback({ tone: "idle", message: "" });
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  function returnToModels() {
    setIsCalendarOpen(false);
    setFeedback({ tone: "idle", message: "" });
    window.requestAnimationFrame(() => {
      document.getElementById("models")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  function persistBookings(nextBookings: LocalBooking[]) {
    setBookings(nextBookings);
    window.localStorage.setItem(storageKey, JSON.stringify(nextBookings));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeSlotIsBooked) {
      setFeedback({
        tone: "error",
        message: "Ce créneau est déjà marqué comme pris sur cet appareil.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ tone: "idle", message: "" });

    const bookingId = `${Date.now()}`;
    const formPayload = {
      "form-name": "booking",
      type_demande: "reservation",
      booking_id: bookingId,
      name,
      contact,
      model: selectedModel.name,
      date: selectedDate,
      time: activeTime,
      nombre_personnes: peopleCount,
      nombre_mains: handCount,
      notes,
    };

    try {
      await submitNetlifyBooking(formPayload);

      const booking: LocalBooking = {
        id: bookingId,
        modelId: selectedModel.id,
        modelName: selectedModel.name,
        date: selectedDate,
        time: activeTime,
        customerName: name,
        contact,
        peopleCount,
        handCount,
        notes,
      };
      const nextBookings = [...bookings, booking];
      persistBookings(nextBookings);
      setName("");
      setContact("");
      setNotes("");
      setFeedback({
        tone: "success",
        message: `Demande envoyée pour ${dateLabel(selectedDate)} à ${activeTime}.`,
      });
    } catch {
      setFeedback({
        tone: "error",
        message: isLocalPreview()
          ? "Le test local ne peut pas envoyer à Netlify. Essaie sur henne06.netlify.app."
          : "L'envoi n'a pas abouti. Vérifie Netlify Forms après le déploiement.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelBooking(booking: LocalBooking) {
    const confirmed = window.confirm(
      `Annuler le créneau du ${dateLabel(booking.date)} à ${booking.time} ?`,
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    setFeedback({ tone: "idle", message: "" });

    const formPayload = {
      "form-name": "booking",
      type_demande: "annulation",
      booking_id: booking.id,
      name: booking.customerName ?? "Annulation depuis le calendrier",
      contact: booking.contact ?? "",
      model: booking.modelName,
      date: booking.date,
      time: booking.time,
      nombre_personnes: booking.peopleCount ?? "",
      nombre_mains: booking.handCount ?? "",
      notes: booking.notes
        ? `ANNULATION - détail initial : ${booking.notes}`
        : "ANNULATION demandée depuis le calendrier",
    };

    try {
      await submitNetlifyBooking(formPayload);

      const nextBookings = bookings.filter((savedBooking) => savedBooking.id !== booking.id);
      persistBookings(nextBookings);
      setSelectedDate(booking.date);
      setSelectedTime(booking.time as BookingTime);
      setFeedback({
        tone: "success",
        message: `Créneau annulé pour ${dateLabel(booking.date)} à ${booking.time}.`,
      });
    } catch {
      setFeedback({
        tone: "error",
        message: isLocalPreview()
          ? "Le test local ne peut pas envoyer l'annulation à Netlify. Essaie sur henne06.netlify.app."
          : "L'annulation n'a pas abouti. Réessaie ou envoie un message directement.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="experience" onPointerMove={handleSpotlight}>
      <div className="grain" aria-hidden="true" />
      <div className="stage-light" aria-hidden="true" />

      {!hasEntered ? (
        <section className="intro-gate" aria-labelledby="intro-title">
          <div className="intro-mark">henne.06</div>
          <h1 id="intro-title">
            <span>henné</span>
            <span>recollection</span>
          </h1>
          <p>Un salon visuel pour choisir ton motif, ton jour et ton heure.</p>
          <button className="hold-button" type="button" onClick={() => setHasEntered(true)}>
            <span>entrer</span>
          </button>
        </section>
      ) : null}

      {!isCalendarOpen ? (
        <>
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-photo" aria-hidden="true">
              <img src="/og.png" alt="" />
            </div>
            <div className="hero-copy">
              <p className="kicker">henné traditionnel dans le 06</p>
              <h1 id="hero-title" className="paint-title" aria-label="henne.06">
                {"henne.06".split("").map((letter, index) => (
                  <span key={`${letter}-${index}`}>{letter}</span>
                ))}
              </h1>
              <p className="hero-text">
                Sélectionne ton dessin, puis ouvre le calendrier dédié à ce modèle.
              </p>
              <a className="spacebar-link" href="#models">
                <span />
                voir les modèles
              </a>
            </div>
            <div className="hero-side">
              <span>mariage</span>
              <span>eid</span>
              <span>soirée</span>
            </div>
          </section>

          <section className="models" id="models" aria-labelledby="models-title">
            <div className="section-heading">
              <p className="kicker">moodboard original</p>
              <h2 id="models-title">Modèles</h2>
            </div>
            <div className="model-list">
              {HENNA_MODELS.map((model, index) => (
                <button
                  type="button"
                  key={model.id}
                  className={`model-card model-card--${model.palette}`}
                  onClick={() => openCalendar(model.id)}
                  style={{ "--delay": `${index * 70}ms` } as React.CSSProperties}
                >
                  <span className="model-index">{String(index + 1).padStart(2, "0")}</span>
                  <ModelArtwork />
                  <span className="model-copy">
                    <strong>{model.name}</strong>
                    <em>{model.tag}</em>
                    <small>{model.mood}</small>
                  </span>
                  <span className="model-cta">ouvrir le calendrier</span>
                </button>
              ))}
            </div>
          </section>
        </>
      ) : (
        <section
          className="reservation reservation--page"
          id="reservation"
          aria-labelledby="reservation-title"
        >
          <div className="reservation-top">
            <button className="back-button" type="button" onClick={returnToModels}>
              ← changer de modèle
            </button>
            <div className={`selected-model-showcase model-card--${selectedModel.palette}`}>
              <ModelArtwork className="selected-model-art" />
              <div className="selected-model-copy">
                <p className="kicker">modèle choisi</p>
                <strong>{selectedModel.name}</strong>
                <span>{selectedModel.tag}</span>
              </div>
            </div>
            <div className="section-heading reservation-heading">
              <p className="kicker">réservation</p>
              <h2 id="reservation-title">Calendrier</h2>
            </div>
            <p className="calendar-page-note">
              Choisis le jour, l&apos;heure, puis complète les détails de ta demande.
            </p>
          </div>

          <div className="reservation-grid">
          <div className="calendar-shell">
            <div className="month-bar">
              <button type="button" onClick={() => moveMonth(-1)} aria-label="Mois précédent">
                ‹
              </button>
              <strong>{monthLabel(monthCursor)}</strong>
              <button type="button" onClick={() => moveMonth(1)} aria-label="Mois suivant">
                ›
              </button>
            </div>

            <div className="weekday-row" aria-hidden="true">
              {weekdays.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calendar-grid">
              {monthDays.map((date, index) => {
                if (!date) {
                  return <span className="day-cell day-cell--empty" key={index} />;
                }

                const dateKey = toDateKey(date);
                const dayBookings = bookingsByDate.get(dateKey) ?? [];
                const isPast = dateKey < todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <button
                    key={dateKey}
                    type="button"
                    className={`day-cell ${isSelected ? "is-selected" : ""}`}
                    disabled={isPast}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span>{date.getDate()}</span>
                    <small>{isPast ? "passé" : `${dayBookings.length} local`}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="booking-panel">
            <div className="booking-poster">
              <div className={`poster-model-preview model-card--${selectedModel.palette}`}>
                <ModelArtwork className="poster-model-art" />
                <span>{selectedModel.name}</span>
              </div>
              <strong>{dateLabel(selectedDate)}</strong>
              <em>{selectedModel.duration}</em>
            </div>

            <div className="time-grid" aria-label="Choisir l'heure">
              {BOOKING_TIMES.map((time) => {
                const bookingForTime = bookingByTime.get(time);
                const isBooked = Boolean(bookingForTime);
                return (
                  <button
                    key={time}
                    type="button"
                    className={[
                      "time-button",
                      activeTime === time ? "is-selected" : "",
                      isBooked ? "is-booked" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    disabled={isSubmitting || (selectedDate < todayKey && !bookingForTime)}
                    onClick={() =>
                      bookingForTime ? handleCancelBooking(bookingForTime) : setSelectedTime(time)
                    }
                  >
                    {time}
                    {bookingForTime ? <span>annuler</span> : null}
                  </button>
                );
              })}
            </div>

            <form
              className="booking-form"
              name="booking"
              method="POST"
              data-netlify="true"
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="form-name" value="booking" />
              <input type="hidden" name="type_demande" value="reservation" />
              <input type="hidden" name="booking_id" value="" />
              <p className="hidden-field">
                <label>
                  Ne pas remplir
                  <input name="bot-field" />
                </label>
              </p>
              <input type="hidden" name="model" value={selectedModel.name} />
              <input type="hidden" name="date" value={selectedDate} />
              <input type="hidden" name="time" value={activeTime} />

              <label>
                Prénom
                <input
                  name="name"
                  autoComplete="given-name"
                  maxLength={80}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label>
                Téléphone ou Instagram
                <input
                  name="contact"
                  autoComplete="tel"
                  maxLength={120}
                  required
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                />
              </label>
              <div className="form-row">
                <label>
                  Personnes
                  <select
                    name="nombre_personnes"
                    required
                    value={peopleCount}
                    onChange={(event) => setPeopleCount(event.target.value)}
                  >
                    {peopleOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Mains au total
                  <select
                    name="nombre_mains"
                    required
                    value={handCount}
                    onChange={(event) => setHandCount(event.target.value)}
                  >
                    {handOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                Détail
                <textarea
                  name="notes"
                  maxLength={260}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </label>

              <button className="submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "envoi..." : "envoyer la demande"}
              </button>
            </form>

            {feedback.message ? (
              <p className={`feedback feedback--${feedback.tone}`} role="status">
                {feedback.message}
              </p>
            ) : null}
          </aside>
        </div>
        </section>
      )}
    </main>
  );
}
