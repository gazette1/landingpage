---
title: "Field Note: Perplexity deep research as the synthesis layer for binary and trinary decision trees"
slug: field-perplexity-decision-trees
archetype: field-note
date: 2026-05-20
project: null
version: null
status: published
tags: [perplexity, deep-research, decision-trees, synthesis, ai-architecture, fdaa]
summary: Most knowledge-work decisions jump from intuition to choice without a synthesis step in between. I run a different shape: map the decision as a tree of binary and trinary branches, write a Perplexity deep-research prompt per node, let the model do the cross-source synthesis, then come back to the node and decide. This Field Note walks the tree-and-prompt pattern, where it works, where it breaks, and what an AI architect would change if they were systematizing it.
---

# Field Note: Perplexity deep research as the synthesis layer for binary and trinary decision trees

By Russ. Field Note, 2026.

---

## The existing approach

Most knowledge-work decisions get made with one of two patterns. Pattern one: pure intuition. You have done enough of these kinds of decisions that you know the answer in 30 seconds; the rest is rationalization. Pattern two: drown the decision in research. You read for hours, skim a dozen sources, accumulate context. Then you choose based on whatever fragment of all that reading you happen to remember when the choice surfaces.

Pattern one fails on novel decisions where intuition has not been earned yet. Pattern two fails because synthesis at the moment of choice is the hardest part of the process. It is also the part most often skipped.

I run a third shape. Map the decision as a tree. Treat each node as a research prompt. Let a synthesis engine (Perplexity's deep research mode in my case) do the cross-source reading and produce a structured comparison. Come back to the node and decide based on the structured output, not on the raw reading.

This is the same architectural pattern as the multi-pass orchestration in Marketing Bot v2. Separate the synthesis pass from the decision pass. Do not collapse them into one human moment.

## Where it works

Three properties of my decision-making context make this shape work.

1. **Most consequential decisions decompose into a tree of binary or trinary choices.** A career move is "stay vs leave" at the top, then "leave to do X vs Y vs Z" at the second level, then per-option "what are the deal-breakers" at the third. A system architecture is "framework A vs B" at the top, then per-framework "what does it cost" and "what does it constrain" at the second. A CRE acquisition is "go vs no-go" at the top, then per-go "what structure" and "what lender pool." Binary and trinary nodes are the natural granularity of consequential decisions. Bigger fan-out usually means the wrong node.

2. **Perplexity's deep research mode is shaped for this work.** It does multi-source web search with explicit citation, synthesizes across sources into a structured response, and tolerates long prompts with multiple sub-questions. It is the closest commercial tool I have used to "go read everything relevant to this specific choice and tell me what the sources agree and disagree about."

3. **The cost-per-research-pass is low enough to do many of them.** A deep research run costs a small amount of credits, runs in 3 to 10 minutes, and produces 2,000 to 5,000 words of synthesized output with citations. At that cost, I can afford to run a fresh research pass per node in a tree. I do not have to reuse one big research dump across multiple decisions.

## Where it breaks

Three failure modes show up.

**Mode one: the tree is wrong before the research starts.** If the binary choice at the top of the tree is framed incorrectly, no amount of research at lower nodes will recover. Spending time on tree structure before any research saves more time than the research itself ever will. The discipline I run: before any prompt goes to Perplexity, I draft and review the tree. This often happens in Obsidian, often the next morning after the initial draft.

**Mode two: the prompts are too vague.** A prompt like "should I take this job?" produces useless synthesis. A prompt like "compare offers A and B against the following six criteria, with explicit sources for each criterion, and flag which criteria the public sources cannot answer" produces useful synthesis. The prompt engineering is the work.

**Mode three: I let the synthesis make the decision.** This is the most dangerous failure mode and the one I have learned to discipline against. The synthesis is input to the decision. It is not the decision. I make the decision, with the synthesis as one of several inputs. The synthesis is allowed to be wrong. If a synthesis says "take the offer" and my gut says "do not," the gut wins the argument. It wins until I can articulate specifically why the synthesis is wrong on a specific criterion.

## What I actually do

The pattern is consistent across decisions.

**Step one: draft the tree.** Open a markdown file in Obsidian. Write the top-level binary or trinary question. Branch into the second level. Stop at depth two or three; deeper trees are usually a signal the top level is wrong.

**Step two: write the prompts.** For each leaf node, write a Perplexity deep research prompt that asks the model to compare options against explicit criteria and to flag which criteria are answerable from public sources and which are not. Save the prompts in the same markdown file next to the tree node.

**Step three: run the prompts.** Paste each prompt into Perplexity deep research mode. Wait. The output comes back as 2,000 to 5,000 words with citations. Save the output to the same markdown file under the node.

**Step four: decide at the node.** Read the synthesis. Make the decision. Write the decision and the one-sentence reason in the markdown file under the node. Move to the next node.

**Step five: review the tree as a whole.** Once every node has a decision, read the tree top to bottom. If the path of decisions makes sense as a whole, commit. If it does not, find the inconsistency and re-run the affected node.

The whole process for a meaningful decision takes 60 to 120 minutes of my time across two or three days. The Perplexity passes do the reading. The markdown file is the audit trail. The final commit is the decision.

## What it costs

The cost stack is small.

**Perplexity Pro subscription:** $20/month. Includes generous deep research quota at my use level.

**Obsidian:** free for personal use. The tree-and-decision markdown files live in the same vault as the rest of my project tracking.

**Time:** 60 to 120 minutes per consequential decision, spread across multiple sittings. The synthesis runs while I do other things, so the wall-clock time exceeds my attention time by a factor of 3 to 5.

The value is harder to quantify but is real. Decisions made with this process have a higher hit rate than decisions I made before adopting it, by my own honest accounting. More importantly, the audit trail means that when a decision turns out wrong, I can read back what I knew at the time and what I did not know. Then I can improve the tree or the prompt for the next decision of the same shape.

## What an AI architect would change

If I were building this as a system instead of running it as a personal discipline, three changes.

**A typed schema for decision-tree nodes.** Each node would have explicit fields: question, options (2 or 3), criteria, prompt, synthesis output, decision, reasoning, date. This would let the system surface patterns across decisions (which kinds of nodes do I get wrong most often, which criteria am I under-weighting).

**Auto-prompt generation from the node.** Given a node with a question and options and criteria, the system could generate the Perplexity prompt automatically using a template. I write a handful of templates by hand each year that I keep tuning. Auto-generation would compress that.

**A retrospective layer.** Three to twelve months after a decision, the system should prompt me for the outcome (did the decision work, what changed, what would I have decided with the information I have now). This closes the loop in a way that my current process does not. It is the thing most likely to make me better at trees over time.

The system version is not for everyone. Most people do not make enough high-stakes decisions per quarter to justify the infrastructure. For someone running multiple projects, multiple side ventures, and an active job search at the same time, it would compound.

## What would not change

The pattern is right. The tree forces structure on the question before any research happens. The per-node prompt forces specificity on what the research should produce. The decision-at-the-node discipline keeps the human in the loop and prevents synthesis-as-decision. The audit trail makes the process improvable.

==The architectural principle: in any high-stakes decision-making process, separate the synthesis pass from the decision pass. The synthesis runs against external knowledge; the decision runs against the synthesis plus the person's specific context and values. Collapsing the two into one moment is the failure mode most knowledge workers default to. Separating them is the discipline that improves hit rate.==

The same pattern applies to investment-committee decisions, to medical second opinions, to architectural design reviews, to hiring decisions, to any choice where the cost of being wrong is high enough to justify spending a couple of hours on structure.

## Closing

The Perplexity-driven decision-tree workflow is the personal infrastructure underneath my career decisions, my CRE deal screens, my AI project architecture choices, and the brand-positioning calls behind this site. Without the tree, decisions feel like guesses. Without the synthesis, the research is unstructured. Without the discipline of deciding at the node, the synthesis substitutes for thinking.

If you are evaluating how to systematize a personal decision-making process, or how to build a team-level decision-support system that respects the human's role in the final choice, or how to use commercial deep-research tools as a synthesis layer for repeated high-stakes choices, the questions worth asking are: how do you draft the tree before any research runs; how do you write per-node prompts that produce structured comparisons rather than narrative dumps; how do you keep the synthesis as input rather than output of the decision; and how do you close the retrospective loop so the process improves.

Those are the questions this Field Note is meant to answer.

For the orchestration discipline that produces structured synthesis at the document level in a different domain, see [Inside Marketing Bot v2](/blog/inside-marketing-bot.html). For the project-tracking counterpart that keeps the trees and the prompts in the same Obsidian vault, see [the Obsidian-Claude Code loop](/blog/field-obsidian-claude-code.html). For the alert layer that notifies me when each deep-research pass completes, see [Discord as the second screen for Claude Code activity](/blog/field-discord-claude-alerts.html).

---

Russ
