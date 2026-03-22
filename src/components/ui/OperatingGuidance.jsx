import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CheckCircle2, ChevronDown, Eye, ListChecks, Route } from 'lucide-react';

function Section({ title, body, ordered = false }) {
  if (!body || (Array.isArray(body) && body.length === 0)) return null;
  const items = Array.isArray(body) ? body : [body];
  const Wrapper = ordered ? 'ol' : 'ul';

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {Array.isArray(body) ? (
        <Wrapper className={`space-y-2 text-sm leading-6 text-muted-foreground ${ordered ? 'list-decimal pl-5' : 'list-disc pl-5'}`}>
          {items.map((item, index) => <li key={index}>{item}</li>)}
        </Wrapper>
      ) : (
        <p className="text-sm leading-6 text-muted-foreground">{body}</p>
      )}
    </div>
  );
}

export function CollapsibleInstructionPanel({ title = 'Page instructions', sections, instructionCards = [], defaultOpen = false }) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="rounded-xl border border-primary/20 bg-card shadow-sm">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="flex h-auto w-full items-center justify-between rounded-xl px-5 py-4 text-left hover:bg-muted/30">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">Instructions</Badge>
              <span className="text-xs text-muted-foreground">Starts collapsed</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground">Open for step-by-step instructions, page explanations, examples, and workflow guidance.</p>
          </div>
          <ChevronDown className="h-5 w-5 shrink-0 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t px-5 py-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <Section title="1. What this page is for" body={sections.purpose} />
            <Section title="2. What you do here (step-by-step instructions)" body={sections.steps} ordered />
            <Section title="3. What each part of the page does" body={sections.parts} />
            <Section title="4. Example" body={sections.example} />
            <Section title="5. What happens after this" body={sections.after} />
            <Section title="6. Tips / mistakes to avoid" body={sections.tips} />
          </div>
          {!!instructionCards.length && (
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {instructionCards.map((instruction) => (
                <div key={instruction.id || instruction.instruction_key} className="rounded-lg border bg-muted/30 p-4">
                  <p className="mb-1 text-sm font-semibold">{instruction.instruction_title}</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{instruction.instruction_body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function NextStepPanel({ step, detail }) {
  if (!step) return null;
  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Route className="h-4 w-4 text-primary" /> Next Step</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium">{step}</p>
        {detail && <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  );
}

export function DocumentationPageIntro({ guide, instructionCards = [] }) {
  return <CollapsibleInstructionPanel title={guide.title} sections={guide.sections} instructionCards={instructionCards} />;
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
