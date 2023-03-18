export function validAddress(input: string) {
  const split = input.split(":");
  if (split.length < 1 || split.length > 2) return false;
  const [host, port] = split;
  if ((typeof port === "string" && !port.match(/^\d+$/)) || host.length > 253)
    return false;
  return host
    .split(".")
    .every(
      (element) => element.match(/^[a-zA-Z\d-]*$/) && element.length <= 63
    );
}
