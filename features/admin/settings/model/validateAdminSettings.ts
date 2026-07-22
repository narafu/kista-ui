import type { RuntimeConfig, RuntimeFieldSettings } from '@entities/runtime-config'

export type AdminSettingsErrors = Record<string, string>

function validateField<T>(key: string, field: RuntimeFieldSettings<T>, errors: AdminSettingsErrors) {
  if (field.allowedValues.length === 0) {
    errors[key] = '허용값을 하나 이상 입력하세요.'
    return
  }
  if (!field.allowedValues.includes(field.defaultValue)) {
    errors[key] = '기본값은 허용값에 포함되어야 합니다.'
    return
  }
  if (!field.customizable && field.allowedValues.length !== 1) {
    errors[key] = '고정 필드는 기본값 하나만 허용할 수 있습니다.'
  }
}

function validateValueSet<T>(key: string, allowedValues: T[], defaultValue: T, errors: AdminSettingsErrors) {
  if (allowedValues.length === 0) {
    errors[key] = '허용값을 하나 이상 입력하세요.'
    return
  }
  if (!allowedValues.includes(defaultValue)) {
    errors[key] = '기본값은 허용값에 포함되어야 합니다.'
  }
}

export function validateAdminSettings(settings: RuntimeConfig): AdminSettingsErrors {
  const errors: AdminSettingsErrors = {}
  for (const [strategy, config] of Object.entries(settings.strategies)) {
    for (const [name, field] of Object.entries(config.fields)) {
      if (field) validateField(`${strategy}.${name}`, field, errors)
    }
  }
  const recurring = settings.strategies.VR.fields.recurringMode
  if (recurring && !recurring.customizable
      && (recurring.defaultValue !== 'HOLD' || recurring.allowedValues.length !== 1 || recurring.allowedValues[0] !== 'HOLD')) {
    errors['VR.recurringMode'] = '고정 정기 입출금 방식은 HOLD만 허용할 수 있습니다.'
  }
  if (settings.benchmarks?.etf) {
    validateValueSet('benchmarks.etf', settings.benchmarks.etf.allowedValues, settings.benchmarks.etf.defaultValue, errors)
  }
  return errors
}
