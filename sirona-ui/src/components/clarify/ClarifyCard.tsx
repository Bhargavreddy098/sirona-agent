import React, { useState, useEffect } from 'react'
import {
  HelpCircle,
  Check,
  CheckSquare,
  Square,
  Circle,
  CheckCircle2,
  CornerDownLeft,
  X,
  Sparkles,
} from 'lucide-react'
import {
  type ClarifyRequest,
  type ClarifyQuestion,
  isRecommended,
  bareChoice,
  submitClarifyAnswers,
  skipClarifyRequest,
} from '../../store/clarifyStore'

export interface ClarifyCardProps {
  request: ClarifyRequest
}

export const ClarifyCard: React.FC<ClarifyCardProps> = ({ request }) => {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [customDrafts, setCustomDrafts] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  // Initialize defaults (select recommended option by default if available)
  useEffect(() => {
    const initial: Record<string, string | string[]> = {}
    for (const q of request.questions) {
      if (q.choices && q.choices.length > 0) {
        const recommended = q.choices.find(isRecommended) || q.choices[0]
        if (q.multiSelect) {
          initial[q.qid] = [bareChoice(recommended)]
        } else {
          initial[q.qid] = bareChoice(recommended)
        }
      }
    }
    setAnswers(initial)
  }, [request.requestId])

  const handleSelectChoice = (question: ClarifyQuestion, choice: string) => {
    const clean = bareChoice(choice)
    if (question.multiSelect) {
      const current = (answers[question.qid] as string[]) || []
      const updated = current.includes(clean)
        ? current.filter((c) => c !== clean)
        : [...current, clean]
      setAnswers({ ...answers, [question.qid]: updated })
    } else {
      setAnswers({ ...answers, [question.qid]: clean })
    }
  }

  const handleCustomChange = (qid: string, text: string) => {
    setCustomDrafts({ ...customDrafts, [qid]: text })
    setAnswers({ ...answers, [qid]: text })
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await submitClarifyAnswers(request.requestId, answers)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    await skipClarifyRequest(request.requestId)
  }

  // Keyboard shortcut: Enter to submit, Esc to skip
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleSkip()
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleConfirm()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [answers, request.requestId])

  return (
    <div
      data-testid="clarify-card"
      data-request-id={request.requestId}
      className="my-3 border border-[var(--dt-border)] bg-[var(--dt-card)] rounded-[14px] shadow-[var(--shadow-subtle)] overflow-hidden transition-all"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--dt-card)] border-b border-[var(--dt-border)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-[6px] bg-[var(--dt-primary)] text-white flex items-center justify-center shadow-xs">
            <HelpCircle className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-[12.5px] font-semibold text-[var(--dt-foreground)] leading-tight">
              Clarification Requested
            </h4>
            <span className="text-[11px] text-[var(--dt-muted-foreground)]">
              {request.questions.length === 1
                ? '1 question requires your guidance'
                : `${request.questions.length} questions require your guidance`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-[11.5px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] px-2 py-1 rounded-[6px] hover:bg-[var(--dt-border)]/30 transition-colors flex items-center gap-1 cursor-pointer"
          title="Skip question (Esc)"
        >
          <X className="w-3.5 h-3.5" />
          <span>Skip</span>
        </button>
      </div>

      {/* Questions list */}
      <div className="p-4 space-y-4 bg-[var(--dt-card)]">
        {request.questions.map((q, idx) => {
          const currentAnswer = answers[q.qid]
          const isMulti = q.multiSelect

          return (
            <div key={q.qid} className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-medium text-[var(--dt-foreground)] leading-snug">
                  {request.questions.length > 1 && (
                    <span className="text-[var(--dt-primary)] font-mono mr-1.5">{idx + 1}.</span>
                  )}
                  {q.question}
                </span>
                <span className="text-[10.5px] text-[var(--dt-muted-foreground)] font-mono shrink-0">
                  {isMulti ? 'Multiple choice' : 'Single choice'}
                </span>
              </div>

              {/* Options pills/cards */}
              {q.choices && q.choices.length > 0 && (
                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {q.choices.map((choice) => {
                    const clean = bareChoice(choice)
                    const recommended = isRecommended(choice)
                    const isSelected = isMulti
                      ? Array.isArray(currentAnswer) && currentAnswer.includes(clean)
                      : currentAnswer === clean

                    return (
                      <div
                        key={choice}
                        onClick={() => handleSelectChoice(q, choice)}
                        className={`flex items-center justify-between p-2.5 rounded-[8px] border transition-all cursor-pointer select-none text-[12.5px] ${
                          isSelected
                            ? 'border-[var(--dt-primary)] bg-[var(--dt-secondary)] text-[var(--dt-foreground)] font-medium shadow-xs'
                            : 'border-[var(--dt-border)] bg-[var(--dt-background)] hover:bg-[var(--dt-muted)] text-[var(--dt-foreground)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isMulti ? (
                            isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[var(--dt-primary)]" />
                            ) : (
                              <Square className="w-4 h-4 text-[var(--dt-muted-foreground)]" />
                            )
                          ) : isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-[var(--dt-primary)]" />
                          ) : (
                            <Circle className="w-4 h-4 text-[var(--dt-muted-foreground)]" />
                          )}
                          <span>{clean}</span>
                        </div>

                        {recommended && (
                          <span className="flex items-center gap-1 text-[10px] font-medium font-sans px-2 py-0.5 rounded-full bg-[var(--dt-secondary)] text-[var(--dt-primary)] border border-[var(--dt-border)]">
                            <Sparkles className="w-3 h-3" />
                            Recommended
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Custom Write-in input */}
              <div className="pt-1">
                <input
                  type="text"
                  value={customDrafts[q.qid] || ''}
                  onChange={(e) => handleCustomChange(q.qid, e.target.value)}
                  placeholder="Or type custom answer here..."
                  className="w-full bg-[var(--dt-background)] border border-[var(--dt-border)] focus:border-[var(--dt-primary)] focus:ring-1 focus:ring-[var(--dt-primary)] rounded-[8px] px-3 py-1.5 text-[12px] text-[var(--dt-foreground)] placeholder:text-[var(--dt-muted-foreground)] outline-none transition-all font-mono"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--dt-sidebar)] border-t border-[var(--dt-sidebar-border)]">
        <span className="text-[11px] text-[var(--dt-muted-foreground)] flex items-center gap-1">
          <CornerDownLeft className="w-3 h-3" />
          <span>Press Cmd+Enter to confirm</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="px-3 py-1.5 text-[12px] text-[var(--dt-muted-foreground)] hover:text-[var(--dt-foreground)] transition-colors rounded-[8px] cursor-pointer"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--dt-primary)] text-white hover:brightness-110 transition-colors text-[12.5px] font-medium shadow-sm cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting...' : 'Confirm & Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
