import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Eye, ListChecks, Route } from 'lucide-react';

function Section({ title, body }) {
  if (!body) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {Array.isArray(body)
        ? body.map((paragraph, index) => (
            <p key={index} className="text-sm leading-6 text-muted-foreground">
              {paragraph}
            </p>
          ))
        : <p className="text-sm leading-6 text-muted-foreground">{body}</p>}
    </div>
  );
}

export function OperatingGuide({ title = 'Operating Guide', description, sections = [], instructionCards = [] }) {
  return (
    <Card className="mb-6 border-primary/20 shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">Operating Guide</Badge>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <p className="text-sm leading-6 text-muted-foreground max-w-4xl">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-5">
        {sections.map((section) => <Section key={section.heading} title={section.heading} body={section.body} />)}
        {instructionCards.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {instructionCards.map((instruction) => (
              <div key={instruction.id || instruction.instruction_key} className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-semibold mb-1">{instruction.instruction_title}</p>
                <p className="text-sm leading-6 text-muted-foreground whitespace-pre-wrap">{instruction.instruction_body}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function QAReviewChecklist({ title = 'QA / Review Checklist', items = [] }) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-lg border p-3">
            <p className="text-sm font-medium">{item.title}</p>
            <p className="text-sm text-muted-foreground leading-6">{item.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function VisibilityRulesPanel({ title = 'Client Visibility Rules', rules = [] }) {
  if (!rules.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Eye className="w-4 h-4 text-blue-600" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="rounded-lg bg-muted/40 p-3">
            <p className="text-sm font-medium">{rule.title}</p>
            <p className="text-sm text-muted-foreground leading-6">{rule.description}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function WorkflowStepsPanel({ title = 'Workflow Steps', steps = [] }) {
  if (!steps.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Route className="w-4 h-4 text-amber-600" /> {title}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {steps.map((step, index) => (
          <div key={index} className="flex gap-3 rounded-lg border p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{index + 1}</div>
            <div>
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-sm text-muted-foreground leading-6">{step.description}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function InstructionPanel({ instructions = [] }) {
  if (!instructions.length) return null;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="w-4 h-4 text-primary" /> Page Instructions</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {instructions.map((instruction) => (
          <div key={instruction.id || instruction.instruction_key} className="rounded-lg border p-3">
            <p className="text-sm font-medium">{instruction.instruction_title}</p>
            <p className="text-sm text-muted-foreground leading-6 whitespace-pre-wrap">{instruction.instruction_body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
