class SnippetFS
  def initialize(dir) = @dir = dir
  def read_template_file(name) = File.read(File.join(@dir, "#{name}.liquid"), encoding: 'UTF-8')
end
