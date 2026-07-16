/**
 * Persist the editor payload before creating a published snapshot.
 * Returning false from save stops publication without masking the save error.
 */
export const saveThenPublishScene = async <Payload>(
  payload: Payload,
  save: (payload: Payload) => Promise<boolean>,
  publish: () => Promise<unknown>
): Promise<boolean> => {
  if (!(await save(payload))) return false;

  await publish();
  return true;
};
