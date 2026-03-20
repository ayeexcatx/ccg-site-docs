import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Eye, ListChecks, Route, ClipboardList, Users, ArrowRightCircle } from 'lucide-react';

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

function InfoCard({ icon: Icon, title, body }) {
  if (!body) return null;
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      {Array.isArray(body)
        ? body.map((item, index) => (
            <p key={index} className="text-sm leading-6 text-muted-foreground">
              {item}
            </p>
          ))
        : <p className="text-sm leading-6 text-muted-foreground">{body}</p>}
    </div>
  );
}

export function PagePurposeHeader({
  badge = 'Page Guide',
  title,
  purpose,
  role,
  workflowSummary,
  visibilityRules,
  nextSteps,
}) {
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{badge}</Badge>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <InfoCard icon={ClipboardList} title="Page purpose" body={purpose} />
          <InfoCard icon={Users} title="Intended user role" body={role} />
          <InfoCard icon={Route} title="Workflow summary" body={workflowSummary} />
          <InfoCard icon={Eye} title="Internal vs client-visible rules" body={visibilityRules} />
          <InfoCard icon={ArrowRightCircle} title="Next steps" body={nextSteps} />
        </div>
      </CardHeader>
    </Card>
  );
}

export function OperatingGuide({ title = 'Operating Guide', description, sections = [], instructionCards = [] }) {
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="secondary">Operating Guide</Badge>
        </div>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <p className="max-w-4xl text-sm leading-6 text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-5">
        {sections.map((section) => <Section key={section.heading} title={section.heading} body={section.body} />)}
        {instructionCards.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2">
            {instructionCards.map((instruction) => (
              <div key={instruction.id || instruction.instruction_key} className="rounded-lg border bg-muted/30 p-4">
                <p className="mb-1 text-sm font-semibold">{instruction.instruction_title}</p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{instruction.instruction_body}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function DocumentationPageIntro({ header, guide, instructionCards = [] }) {
  return (
    <div className="space-y-4">
      <PagePurposeHeader {...header} />
      <OperatingGuide {...guide} instructionCards={instructionCards} />
    </div>
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
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{instruction.instruction_body}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
