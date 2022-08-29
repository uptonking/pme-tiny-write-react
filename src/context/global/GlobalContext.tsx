import { useCreateCtrlEditor } from '../../common/ctrl';
import type { State } from '../../common/state';
import { createProvider } from '../../utils/create-provider';

export const [GlobalProvider, useGlobalContext, useGlobalDispatch] = createProvider(
  ({ initialState }: { initialState: State }) => {
    const [store, ctrl] = useCreateCtrlEditor(initialState);

    const dispatch = (action: Record<string, unknown>) => {};

    return [{ store, ctrl }, dispatch];
  },
);
