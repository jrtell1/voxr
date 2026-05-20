defmodule VoxrWeb.Router do
  use VoxrWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/api", VoxrWeb do
    pipe_through :api

    post "/login", AuthController, :login
    get "/info", ServerController, :info
    get "/channels", ChannelController, :index
    get "/channels/:id/messages", MessageController, :index
  end
end
