"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { BOOKING_TIMES, HENNA_MODELS, type HennaModel } from "./henna-data";

type PublicBooking = {
  id: number;
  modelId: string;
  modelName: string;
  date: string;
  time: string;
  status: string;
  createdAt: string;
};

type BookingFeedback = {
  tone: "idle" | "success" | "error";
  message: string;
};

const weekdays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
type BookingTime = (typeof BOOKING_TIMES)[number];
type ModelId = HennaModel["id"];

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
  const daysInMonth = new Date(
    first.getFullYear(),
    first.getMonth() + 1,
    0,
  ).getDate();

  return Array.from({ length: leadingEmptyDays + daysInMonth }, (_, index) => {
    if (index < leadingEmptyDays) {
      return null;
    }

    const day = index - leadingEmptyDays + 1;
    return new Date(first.getFullYear(), first.getMonth(), day);
  });
}

function modelById(modelId: string): HennaModel {
  return HENNA_MODELS.find((model) => model.id === modelId) ?? HENNA_MODELS[0];
}

export function HennaBookingApp() {
  const todayKey = toDateKey(new Date());
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [selectedTime, setSelectedTime] = useState<BookingTime>(BOOKING_TIMES[1]);
  const [selectedModelId, setSelectedModelId] = useState<ModelId>(HENNA_MODELS[0].id);
  const [bookings, setBookings] = useState<PublicBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<BookingFeedback>({
    tone: "idle",
    message: "",
  });

  const selectedModel = modelById(selectedModelId);

  const monthRange = useMemo(() => {
    const start = startOfMonth(monthCursor);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);

    return {
      start: toDateKey(start),
      end: toDateKey(end),
    };
  }, [monthCursor]);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/bookings?start=${monthRange.start}&end=${monthRange.end}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          bookings?: PublicBooking[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Chargement impossible");
        }

        setBookings(payload.bookings ?? []);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setFeedback({
          tone: "error",
          message:
            "Le calendrier se charge mal pour l'instant. Réessaie dans quelques secondes.",
        });
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [monthRange, refreshKey]);

  const bookingsByDate = useMemo(() => {
    const grouped = new Map<string, PublicBooking[]>();

    bookings.forEach((booking) => {
      const dayBookings = grouped.get(booking.date) ?? [];
      dayBookings.push(booking);
      grouped.set(
        booking.date,
        dayBookings.sort((first, second) => first.time.localeCompare(second.time)),
      );
    });

    return grouped;
  }, [bookings]);

  const selectedDayBookings = useMemo(
    () => bookingsByDate.get(selectedDate) ?? [],
    [bookingsByDate, selectedDate],
  );
  const bookedTimes = useMemo(
    () => new Set(selectedDayBookings.map((booking) => booking.time)),
    [selectedDayBookings],
  );
  const nextOpenSlot = BOOKING_TIMES.find((time) => !bookedTimes.has(time));
  const activeTime =
    bookedTimes.has(selectedTime) && nextOpenSlot ? nextOpenSlot : selectedTime;
  const activeSlotIsBooked = bookedTimes.has(activeTime);

  function moveMonth(direction: -1 | 1) {
    setMonthCursor(
      (current) => new Date(current.getFullYear(), current.getMonth() + direction, 1),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (activeSlotIsBooked) {
      setFeedback({
        tone: "error",
        message: "Ce créneau vient d'être pris. Choisis une autre heure.",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback({ tone: "idle", message: "" });

    const response = await fetch("/api/bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        contact,
        notes,
        modelId: selectedModel.id,
        date: selectedDate,
        time: activeTime,
      }),
    });

    const payload = (await response.json()) as {
      booking?: PublicBooking;
      error?: string;
    };

    setIsSubmitting(false);

    if (!response.ok) {
      setFeedback({
        tone: "error",
        message: payload.error ?? "Impossible d'envoyer la demande.",
      });
      setRefreshKey((current) => current + 1);
      return;
    }

    setName("");
    setContact("");
    setNotes("");
    setFeedback({
      tone: "success",
      message: `Demande reçue pour ${dateLabel(selectedDate)} à ${activeTime}.`,
    });
    setRefreshKey((current) => current + 1);
  }

  const monthDays = buildMonthDays(monthCursor);

  return (
    <main className="site-shell">
      <div className="ambient-pattern" aria-hidden="true" />
      <section className="brand-band" aria-labelledby="brand-title">
        <div className="henna-lace henna-lace--top" aria-hidden="true" />
        <div className="henna-lace henna-lace--bottom" aria-hidden="true" />
        <div className="brand-copy">
          <p className="eyebrow">Henné traditionnel dans le 06</p>
          <h1 id="brand-title">henne.06</h1>
          <p className="brand-subtitle">
            Modèles inspirés des moodboards Pinterest, dessinés ici en version
            originale pour mariages, fêtes, Eid, soirées et petits rendez-vous.
          </p>
          <div className="hero-actions" aria-label="Points forts">
            <a className="primary-link" href="#calendar-title">
              Réserver
            </a>
            <span>12 modèles</span>
            <span>Créneaux en direct</span>
          </div>
        </div>
        <div className="brand-visual">
          <span className="visual-spark visual-spark--one" aria-hidden="true" />
          <span className="visual-spark visual-spark--two" aria-hidden="true" />
          <Image
            className="brand-image"
            src="/og.png"
            alt="Mains avec henné, cônes et calendrier henne.06"
            width={1600}
            height={900}
            priority
            sizes="(max-width: 980px) 100vw, 52vw"
          />
          <div className="visual-caption" aria-hidden="true">
            <span>Motifs fins</span>
            <span>Mariage</span>
            <span>Fêtes</span>
          </div>
        </div>
      </section>

      <section className="model-section" aria-labelledby="models-title">
        <div className="section-ornament" aria-hidden="true" />
        <div className="section-heading">
          <p className="eyebrow">Moodboard henné</p>
          <h2 id="models-title">Choisir le modèle</h2>
        </div>

        <div className="model-grid">
          {HENNA_MODELS.map((model) => (
            <button
              className={`model-card ${
                model.id === selectedModel.id ? "model-card--selected" : ""
              }`}
              type="button"
              key={model.id}
              aria-pressed={model.id === selectedModel.id}
              onClick={() => setSelectedModelId(model.id)}
            >
              <span className={`motif ${model.pattern}`} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="model-meta">
                <strong>{model.name}</strong>
                <span>{model.tag}</span>
                <small>{model.duration}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="booking-section" aria-labelledby="calendar-title">
        <div className="section-ornament section-ornament--right" aria-hidden="true" />
        <div className="section-heading calendar-heading">
          <div>
            <p className="eyebrow">Réservation</p>
            <h2 id="calendar-title">Calendrier géant</h2>
          </div>
          <div className="month-controls" aria-label="Changer de mois">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              aria-label="Mois précédent"
            >
              ‹
            </button>
            <span>{monthLabel(monthCursor)}</span>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              aria-label="Mois suivant"
            >
              ›
            </button>
          </div>
        </div>

        <div className="booking-layout">
          <div className="calendar-panel">
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
                const isFull = dayBookings.length >= BOOKING_TIMES.length;

                return (
                  <button
                    className={`day-cell ${isSelected ? "day-cell--selected" : ""}`}
                    type="button"
                    key={dateKey}
                    disabled={isPast}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span className="day-number">{date.getDate()}</span>
                    <span className={`day-status ${isFull ? "day-status--full" : ""}`}>
                      {isPast ? "Passé" : isFull ? "Complet" : `${dayBookings.length} pris`}
                    </span>
                    <span className="booking-dots">
                      {dayBookings.slice(0, 3).map((booking) => (
                        <span key={booking.id}>
                          {booking.time} · {booking.modelName}
                        </span>
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="calendar-note" aria-live="polite">
              {isLoading ? "Mise à jour du calendrier..." : "Créneaux affichés en temps réel."}
            </p>
          </div>

          <aside className="reservation-panel" aria-label="Demande de réservation">
            <div className="reservation-summary">
              <span className={`motif motif--small ${selectedModel.pattern}`} aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <div>
                <p>{selectedModel.name}</p>
                <span>{dateLabel(selectedDate)}</span>
              </div>
            </div>

            <div className="time-grid" aria-label="Choisir l'heure">
              {BOOKING_TIMES.map((time) => {
                const isBooked = bookedTimes.has(time);
                return (
                  <button
                    key={time}
                    type="button"
                    className={activeTime === time ? "time-button time-button--selected" : "time-button"}
                    disabled={isBooked || selectedDate < todayKey}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                    {isBooked ? <span>Pris</span> : null}
                  </button>
                );
              })}
            </div>

            <form className="booking-form" onSubmit={handleSubmit}>
              <label>
                Prénom
                <input
                  autoComplete="given-name"
                  maxLength={80}
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Sarah"
                />
              </label>
              <label>
                Téléphone ou Instagram
                <input
                  autoComplete="tel"
                  maxLength={120}
                  required
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  placeholder="06... ou @pseudo"
                />
              </label>
              <label>
                Détail
                <textarea
                  maxLength={260}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Main droite, pieds, événement..."
                />
              </label>

              <button
                className="submit-button"
                type="submit"
                disabled={isSubmitting || activeSlotIsBooked || selectedDate < todayKey}
              >
                {isSubmitting ? "Envoi..." : "Bloquer ce créneau"}
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
    </main>
  );
}
