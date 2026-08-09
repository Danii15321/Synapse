import "server-only"

export class ContentNotFoundError extends Error {
  constructor(resource: string, identifier: string) {
    super(`${resource} introuvable : ${identifier}`)
    this.name = "ContentNotFoundError"
  }
}

export class NotEntitledError extends Error {
  constructor(resource: string, requirement: string) {
    super(`Accès refusé à ${resource} : ${requirement}`)
    this.name = "NotEntitledError"
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ValidationError"
  }
}

export class RateLimitedError extends Error {
  readonly retryAfterSeconds: number

  constructor(retryAfterSeconds: string | number) {
    super("Limite de requêtes atteinte")
    this.name = "RateLimitedError"
    const parsedRetryAfter = Number(retryAfterSeconds)
    this.retryAfterSeconds =
      Number.isFinite(parsedRetryAfter) && parsedRetryAfter > 0
        ? Math.ceil(parsedRetryAfter)
        : 1
  }
}

export class AccountAlreadyExistsError extends Error {
  constructor() {
    super("Un compte existe déjà pour cette adresse")
    this.name = "AccountAlreadyExistsError"
  }
}

export class InvalidCurrentPasswordError extends Error {
  constructor() {
    super("Le mot de passe actuel est invalide")
    this.name = "InvalidCurrentPasswordError"
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Authentification requise")
    this.name = "UnauthorizedError"
  }
}

export class RegistrationsClosedError extends Error {
  constructor() {
    super("Les participations sont closes")
    this.name = "RegistrationsClosedError"
  }
}

export class ActivityFullError extends Error {
  constructor() {
    super("L'activité est complète")
    this.name = "ActivityFullError"
  }
}

export class ParticipationNotAllowedError extends Error {
  constructor() {
    super("Cette activité n'accepte pas de participation")
    this.name = "ParticipationNotAllowedError"
  }
}

type ErrorMapping = Readonly<{
  status: number
}>

function hasErrorName(error: unknown, name: string): boolean {
  return error instanceof Error && error.name === name
}

export function mapDomainError(error: unknown): ErrorMapping {
  if (
    error instanceof ContentNotFoundError ||
    hasErrorName(error, "ContentNotFoundError")
  ) {
    return { status: 404 }
  }
  if (
    error instanceof NotEntitledError ||
    hasErrorName(error, "NotEntitledError")
  ) {
    return { status: 403 }
  }
  if (
    error instanceof ValidationError ||
    hasErrorName(error, "ValidationError")
  ) {
    return { status: 400 }
  }
  if (
    error instanceof RateLimitedError ||
    hasErrorName(error, "RateLimitedError")
  ) {
    return { status: 429 }
  }
  if (
    error instanceof UnauthorizedError ||
    hasErrorName(error, "UnauthorizedError")
  ) {
    return { status: 401 }
  }
  if (
    error instanceof RegistrationsClosedError ||
    hasErrorName(error, "RegistrationsClosedError") ||
    error instanceof ActivityFullError ||
    hasErrorName(error, "ActivityFullError") ||
    error instanceof ParticipationNotAllowedError ||
    hasErrorName(error, "ParticipationNotAllowedError")
  ) {
    return { status: 409 }
  }
  if (
    error instanceof InvalidCurrentPasswordError ||
    hasErrorName(error, "InvalidCurrentPasswordError")
  ) {
    return { status: 400 }
  }

  return { status: 500 }
}
