defmodule VoxrWeb.ServerController do
  use VoxrWeb, :controller

  def info(conn, _params) do
    json(conn, %{name: Application.get_env(:voxr, :server_name, "Voxr")})
  end
end
