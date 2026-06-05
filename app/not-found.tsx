import { ErrorDisplay } from '@widgets/error-display'

export default function NotFound() {
  return <ErrorDisplay code={404} standalone={true} />
}
