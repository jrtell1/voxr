defmodule Voxr.Storage do
  @moduledoc """
  Resolves the on-disk directory for user-uploaded files (images, custom emojis).

  Defaults to the app's `priv/static` tree, which is fine for local `mix`
  development. In production `:storage_dir` is configured to a writable,
  volume-mounted path (see config/prod.exs) so uploads survive redeploys and
  version bumps — the priv tree lives inside the versioned, read-only release.
  """

  @subdirs ~w(uploads emojis)

  @doc """
  Absolute directory for the given storage subdir ("uploads" or "emojis").
  Used by the upload/emoji controllers for reading and writing files.
  """
  def dir(sub) when sub in @subdirs do
    case Application.get_env(:voxr, :storage_dir) do
      nil -> Application.app_dir(:voxr, "priv/static/#{sub}")
      base -> Path.join(base, sub)
    end
  end
end
