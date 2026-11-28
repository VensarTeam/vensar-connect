import { useLocation } from 'react-router-dom'
import { LoginClassic } from './LoginClassic'
import { LoginOptionB } from './LoginOptionB'
import { LoginOptionC } from './LoginOptionC'
import type { LoginScreenProps } from './LoginScreen'

// Change the component here to choose which design each URL displays.
const loginScreens = {
  '/': LoginClassic,
  '/login': LoginClassic,
  '/login/option-b': LoginOptionB,
  '/login/option-c': LoginOptionC,
} as const

export function LoginRoutes(props: LoginScreenProps) {
  const { pathname } = useLocation()
  const Screen = loginScreens[pathname as keyof typeof loginScreens] ?? LoginClassic
  return <Screen {...props} />
}
