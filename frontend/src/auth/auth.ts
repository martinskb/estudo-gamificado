const TOKEN = 'auth:token'
const NICK = 'auth:nickname'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const getToken = () => read(TOKEN)
export const getNickname = () => read(NICK)

export function saveLogin(token: string, nickname: string): void {
  try {
    localStorage.setItem(TOKEN, token)
    localStorage.setItem(NICK, nickname)
  } catch {
    // sem armazenamento: o login vale só até recarregar
  }
}

export function clearLogin(): void {
  try {
    localStorage.removeItem(TOKEN)
    localStorage.removeItem(NICK)
    // O cronômetro em andamento é de quem estava logado: não pode passar para a próxima pessoa.
    localStorage.removeItem('timer:v1')
  } catch {
    // nada a limpar
  }
}
