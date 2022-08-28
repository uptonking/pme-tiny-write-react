import { useCreateCtrlEditor } from '../../common/ctrl';
import type { State } from '../../common/state';
import { createProvider } from '../../utils/create-provider';

export const [GlobalProvider, useGlobalContext, useGlobalDispatch] =
  createProvider(({ initialData }: { initialData: State }) => {
    const [store, ctrl] = useCreateCtrlEditor(initialData);

    const dispatch = (action: Record<string, unknown>) => {};

    return [{ store, ctrl }, dispatch];
  });
