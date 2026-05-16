import { ErrorDisplay } from '@/components/common/ErrorDisplay'

export default function NotFound() {
  return <ErrorDisplay code={404} standalone={true} />
}
