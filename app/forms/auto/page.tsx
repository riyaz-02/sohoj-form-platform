'use client'
/**
 * /forms/auto — Direct upload without a pre-selected form type.
 *
 * The dashboard sets formId='auto' in context before navigating here.
 * FormPage reads formId from context when URL params are absent.
 */
import FormPage from '@/app/forms/[formId]/page'

export default function AutoPage() {
  return <FormPage />
}
