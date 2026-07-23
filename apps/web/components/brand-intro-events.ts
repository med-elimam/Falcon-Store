export const HOME_INTRO_REQUEST_EVENT = "falcon:intro:request";
export const HOME_INTRO_CANCEL_EVENT = "falcon:intro:cancel";

export interface HomeIntroRequestDetail {
  target: string;
}

export function requestHomeIntro(target = "/") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<HomeIntroRequestDetail>(HOME_INTRO_REQUEST_EVENT, {
      detail: { target },
    })
  );
}
