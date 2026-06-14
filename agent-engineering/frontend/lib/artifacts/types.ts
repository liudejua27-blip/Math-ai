export const artifactKinds = ["text", "code", "sheet"] as const;

export type ArtifactKind = (typeof artifactKinds)[number];

export type UIArtifact = {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
};
