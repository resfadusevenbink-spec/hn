import { BOOKING_TIMES, HENNA_MODELS } from "../../henna-data";
import { createBooking, listPublicBookings } from "../../../db/bookings";

type BookingPayload = {
  name?: string;
  contact?: string;
  notes?: string;
  modelId?: string;
  date?: string;
  time?: string;
};

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function todayInFrance() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
  }).format(new Date());
}

function isValidDateKey(value: string) {
  if (!datePattern.test(value)) {
    return false;
  }

  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && value === date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get("start") ?? todayInFrance();
    const end = url.searchParams.get("end") ?? start;

    if (!isValidDateKey(start) || !isValidDateKey(end)) {
      return Response.json({ error: "Dates invalides." }, { status: 400 });
    }

    const bookings = await listPublicBookings(start, end);
    return Response.json({ bookings });
  } catch {
    return Response.json(
      { error: "Le calendrier n'est pas disponible pour le moment." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => null)) as BookingPayload | null;
    const name = cleanText(payload?.name, 80);
    const contact = cleanText(payload?.contact, 120);
    const notes = cleanText(payload?.notes, 260);
    const model = HENNA_MODELS.find((item) => item.id === payload?.modelId);
    const date = cleanText(payload?.date, 10);
    const time = cleanText(payload?.time, 5);

    if (!name || !contact) {
      return Response.json(
        { error: "Ajoute ton prénom et un contact pour confirmer." },
        { status: 400 },
      );
    }

    if (!model) {
      return Response.json({ error: "Choisis un modèle valide." }, { status: 400 });
    }

    if (!isValidDateKey(date) || date < todayInFrance()) {
      return Response.json({ error: "Choisis une date à venir." }, { status: 400 });
    }

    if (!BOOKING_TIMES.includes(time as (typeof BOOKING_TIMES)[number])) {
      return Response.json({ error: "Choisis une heure disponible." }, { status: 400 });
    }

    const booking = await createBooking({
      name,
      contact,
      notes,
      modelId: model.id,
      modelName: model.name,
      date,
      time,
    });

    return Response.json({ booking }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("already booked") ? 409 : 500;

    return Response.json(
      {
        error:
          status === 409
            ? "Ce créneau est déjà pris. Choisis une autre heure."
            : "Impossible d'envoyer la demande pour le moment.",
      },
      { status },
    );
  }
}
