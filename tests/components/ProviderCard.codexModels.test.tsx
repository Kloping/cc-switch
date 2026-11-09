import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProviderCard } from "@/components/providers/ProviderCard";
import type { Provider } from "@/types";
import { createTestQueryClient } from "../utils/testQueryClient";

vi.mock("@/components/providers/ProviderCardActions", () => ({
  ProviderCardActions: () => null,
}));
vi.mock("@/components/ProviderIcon", () => ({ ProviderIcon: () => null }));
vi.mock("@/components/UsageFooter", () => ({ default: () => null }));
vi.mock("@/components/SubscriptionQuotaFooter", () => ({
  default: ({ appId }: { appId: string }) => (
    <span data-testid="subscription-quota">{appId}</span>
  ),
}));
vi.mock("@/components/CopilotQuotaFooter", () => ({ default: () => null }));
vi.mock("@/components/CodexOauthQuotaFooter", () => ({ default: () => null }));
vi.mock("@/components/XaiOauthQuotaFooter", () => ({ default: () => null }));
vi.mock("@/components/AgyAccountQuotaFooter", () => ({
  default: ({ accountId }: { accountId: string }) => (
    <span data-testid="agy-account-quota">{accountId}</span>
  ),
}));
const platform = vi.hoisted(() => ({ mac: true }));
vi.mock("@/lib/platform", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/platform")>()),
  isMac: () => platform.mac,
}));
vi.mock("@/lib/query/failover", () => ({
  useProviderHealth: () => ({ data: undefined }),
}));
vi.mock("@/lib/query/queries", () => ({
  useUsageQuery: () => ({ data: undefined }),
}));

function renderCard(provider: Provider, appId: "codex" | "claude" = "codex") {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      <ProviderCard
        provider={provider}
        appId={appId}
        isCurrent={false}
        presentation={{ chips: [], buttons: [] }}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onConfigureUsage={vi.fn()}
        onOpenWebsite={vi.fn()}
        onDuplicate={vi.fn()}
      />
    </QueryClientProvider>,
  );
}

const codexConfig = `model_provider = "custom"
model = "gpt-5.6-sol"

[model_providers.custom]
name = "Relay"
base_url = "https://relay.example.com/v1"`;

const relay: Provider = {
  id: "relay",
  name: "Relay",
  settingsConfig: {
    auth: { OPENAI_API_KEY: "sk-test" },
    config: codexConfig,
    modelCatalog: {
      models: [
        { model: "deepseek-v4" },
        { model: " deepseek-v4 " },
        { model: "" },
        { model: "kimi-k3" },
        { model: "glm-5" },
      ],
    },
  },
};

const modelChips = () =>
  screen.queryAllByTestId("codex-card-model").map((el) => el.textContent);

describe("ProviderCard Codex model ids", () => {
  it("shows the first two catalog model ids next to the name", () => {
    renderCard(relay);
    expect(modelChips()).toEqual(["deepseek-v4", "kimi-k3"]);
    expect(screen.getByTitle("kimi-k3")).toBeInTheDocument();
    expect(
      screen.getByText("https://relay.example.com/v1"),
    ).toBeInTheDocument();
  });

  it("falls back to the config.toml model without a catalog", () => {
    renderCard({
      ...relay,
      settingsConfig: {
        auth: { OPENAI_API_KEY: "sk-test" },
        config: codexConfig,
      },
    });
    expect(modelChips()).toEqual(["gpt-5.6-sol"]);
  });

  it("shows nothing when no model is configured", () => {
    renderCard({
      ...relay,
      settingsConfig: {
        auth: { OPENAI_API_KEY: "sk-test" },
        config: codexConfig.replace(/^model = .*$/m, ""),
      },
    });
    expect(modelChips()).toEqual([]);
  });

  it("leaves other apps alone", () => {
    renderCard(relay, "claude");
    expect(modelChips()).toEqual([]);
  });
});
