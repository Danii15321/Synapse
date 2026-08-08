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

type ErrorMapping = Readonly<{
  status: number
}>

export function mapDomainError(error: unknown): ErrorMapping {
  if (error instanceof ContentNotFoundError) {
    return { status: 404 }
  }
  if (error instanceof NotEntitledError) {
    return { status: 403 }
  }
  if (error instanceof ValidationError) {
    return { status: 400 }
  }
  if (error instanceof RateLimitedError) {
    return { status: 429 }
  }
  if (error instanceof UnauthorizedError) {
    return { status: 401 }
  }
  if (error instanceof InvalidCurrentPasswordError) {
    return { status: 400 }
  }

  return { status: 500 }
}
