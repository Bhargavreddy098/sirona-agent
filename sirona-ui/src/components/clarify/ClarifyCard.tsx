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
      className="my-4 border border-[#016a71] bg-[#ffffff] rounded-[16px] shadow-[0_4px_16px_rgba(1,106,113,0.08),var(--shadow-subtle)] overflow-hidden transition-all"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#f0f7f7] border-b border-[#cce5e5]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-[#016a71] text-white flex items-center justify-center shadow-xs">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[13px] font-medium text-[#014f54] leading-tight">
              Clarification Requested
            </h4>
            <span className="text-[11px] text-[#558285]">
              {request.questions.length === 1
                ? '1 question requires your guidance'
                : `${request.questions.length} questions require your guidance`}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-[12px] text-[#72706b] hover:text-[#27251e] px-2.5 py-1 rounded-[6px] hover:bg-[#e4efef] transition-colors flex items-center gap-1 cursor-pointer"
          title="Skip question (Esc)"
        >
          <X className="w-3.5 h-3.5" />
          <span>Skip</span>
        </button>
      </div>

      {/* Questions list */}
      <div className="p-4 space-y-5 bg-[#ffffff]">
        {request.questions.map((q, idx) => {
          const currentAnswer = answers[q.qid]
          const isMulti = q.multiSelect

          return (
            <div key={q.qid} className="space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[14px] font-medium text-[#27251e] leading-snug">
                  {request.questions.length > 1 && (
                    <span className="text-[#016a71] font-mono mr-1.5">{idx + 1}.</span>
                  )}
                  {q.question}
                </span>
                <span className="text-[11px] text-[#92918b] font-mono shrink-0">
                  {isMulti ? 'Multiple choice' : 'Single choice'}
                </span>
              </div>

              {/* Options pills/cards */}
              {q.choices && q.choices.length > 0 && (
                <div className="grid grid-cols-1 gap-2 pt-1">
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
                        className={`flex items-center justify-between p-2.5 rounded-[10px] border transition-all cursor-pointer select-none text-[13px] ${
                          isSelected
                            ? 'border-[#016a71] bg-[#f0f7f7] text-[#014f54] font-medium shadow-xs'
                            : 'border-[#e2e2de] bg-[#fdfbfa] hover:bg-[#f5f3ef] text-[#27251e]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isMulti ? (
                            isSelected ? (
                              <CheckSquare className="w-4 h-4 text-[#016a71]" />
                            ) : (
                              <Square className="w-4 h-4 text-[#92918b]" />
                            )
                          ) : isSelected ? (
                            <CheckCircle2 className="w-4 h-4 text-[#016a71]" />
                          ) : (
                            <Circle className="w-4 h-4 text-[#92918b]" />
                          )}
                          <span>{clean}</span>
                        </div>

                        {recommended && (
                          <span className="flex items-center gap-1 text-[10px] font-medium font-sans px-2 py-0.5 rounded-full bg-[#e6f4f1] text-[#016a71] border border-[#b2ded7]">
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
                  className="w-full bg-[#faf8f5] border border-[#d1d1cd] focus:border-[#016a71] focus:bg-[#ffffff] rounded-[8px] px-3 py-1.5 text-[12px] text-[#27251e] placeholder:text-[#92918b] outline-none transition-all font-mono"
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#faf8f5] border-t border-[#e2e2de]">
        <span className="text-[11px] text-[#72706b] flex items-center gap-1">
          <CornerDownLeft className="w-3 h-3" />
          <span>Press Enter to confirm</span>
        </span>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="px-3 py-1.5 text-[12px] text-[#72706b] hover:text-[#27251e] transition-colors rounded-[8px] cursor-pointer"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#016a71] text-white hover:bg-[#01585e] transition-colors text-[13px] font-medium shadow-[var(--shadow-subtle)] cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{submitting ? 'Submitting...' : 'Confirm & Continue'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
