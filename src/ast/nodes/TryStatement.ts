import type { NormalizedTreeshakingOptions } from '../../rollup/types';
import type { HasEffectsContext, InclusionContext } from '../ExecutionContext';
import type BlockStatement from './BlockStatement';
import type CatchClause from './CatchClause';
import type * as NodeType from './NodeType';
import { INCLUDE_PARAMETERS, type IncludeChildren, StatementBase } from './shared/Node';

export default class TryStatement extends StatementBase {
	declare block: BlockStatement;
	declare finalizer: BlockStatement | null;
	declare handler: CatchClause | null;
	declare type: NodeType.tTryStatement;

	private directlyIncluded = false;
	private includedLabelsAfterBlock: string[] | null = null;

	hasEffects(context: HasEffectsContext): boolean {
		return (
			((this.context.options.treeshake as NormalizedTreeshakingOptions).tryCatchDeoptimization
				? this.block.body.length > 0
				: this.block.hasEffects(context)) ||
			(this.finalizer !== null && this.finalizer.hasEffects(context))
		);
	}

	include(context: InclusionContext, includeChildrenRecursively: IncludeChildren): void {
		const tryCatchDeoptimization = (this.context.options.treeshake as NormalizedTreeshakingOptions)
			?.tryCatchDeoptimization;
		const { brokenFlow } = context;
		if (!this.directlyIncluded || !tryCatchDeoptimization) {
			this.included = true;
			this.directlyIncluded = true;
			this.block.include(
				context,
				tryCatchDeoptimization ? INCLUDE_PARAMETERS : includeChildrenRecursively
			);
			if (context.includedLabels.size > 0) {
				this.includedLabelsAfterBlock = [...context.includedLabels];
			}
			context.brokenFlow = brokenFlow;
		} else if (this.includedLabelsAfterBlock) {
			for (const label of this.includedLabelsAfterBlock) {
				context.includedLabels.add(label);
			}
		}
		if (this.handler !== null) {
			this.handler.include(context, includeChildrenRecursively);
			context.brokenFlow = brokenFlow;
		}
		if (this.finalizer !== null) {
			this.finalizer.include(context, includeChildrenRecursively);
		}
	}
}
